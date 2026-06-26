"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { scrapeUrl } from "@/lib/providers/apify";
import type { TablesInsert } from "@/lib/db";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Scrape a URL via Apify, persist the product, and attach it to the project.
 * Returns nothing — UI revalidates via the project page.
 */
export async function scrapeAndAttach(projectId: string, url: string) {
  const { supabase, user } = await requireUser();

  // 1. Insert the product row with pending status so the UI shows progress.
  const insertPayload: TablesInsert<"products"> = {
    user_id: user.id,
    source_type: "url",
    source_url: url,
    scrape_status: "processing",
  };
  const { data: product, error: insErr } = await supabase
    .from("products")
    .insert(insertPayload)
    .select("id")
    .single();
  if (insErr || !product) throw insErr ?? new Error("could not create product");

  // 2. Attach to the project immediately so a refresh resumes here.
  await supabase
    .from("projects")
    .update({ product_id: product.id, current_step: 2 })
    .eq("id", projectId);

  // 3. Run Apify. On failure, mark product as failed so UI surfaces it.
  try {
    const result = await scrapeUrl(url);

    console.log("[products.scrapeAndAttach] saving", {
      productId: product.id,
      name: result.name,
      descChars: result.description?.length ?? 0,
      images: result.images.length,
    });

    const { error: updErr } = await supabase
      .from("products")
      .update({
        scrape_status: "ready",
        apify_run_id: result.runId,
        name: result.name,
        description: result.description,
        images: result.images,
        raw: result.raw as never,
      })
      .eq("id", product.id);
    if (updErr) console.error("[products.scrapeAndAttach] product update failed", updErr);

    // Seed product_name on the project if empty so the Brief Editor starts populated.
    const { error: seedErr } = await supabase
      .from("projects")
      .update({ product_name: result.name ?? null })
      .eq("id", projectId)
      .is("product_name", null);
    if (seedErr) console.error("[products.scrapeAndAttach] project seed failed", seedErr);
  } catch (e) {
    console.error("[products.scrapeAndAttach] failed", e);
    await supabase
      .from("products")
      .update({ scrape_status: "failed", error: e instanceof Error ? e.message : String(e) })
      .eq("id", product.id);
    throw e;
  } finally {
    revalidatePath(`/create/${projectId}/product`);
  }
}

export async function setManualProduct(projectId: string, name: string) {
  const { supabase, user } = await requireUser();
  const { data: product, error } = await supabase
    .from("products")
    .insert({ user_id: user.id, source_type: "manual", name, scrape_status: "ready" })
    .select("id")
    .single();
  if (error || !product) throw error ?? new Error("could not create product");
  await supabase
    .from("projects")
    .update({ product_id: product.id, product_name: name, current_step: 2 })
    .eq("id", projectId);
  revalidatePath(`/create/${projectId}/product`);
}
