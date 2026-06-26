import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stepFromNumber } from "@/lib/steps";

// Bare /create/[id] has no page of its own — bounce to the furthest reached
// step so library / sidebar / any future deep-link without a slug Just Works.
export default async function CreateIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, current_step")
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();
  redirect(`/create/${project.id}/${stepFromNumber(project.current_step).slug}`);
}
