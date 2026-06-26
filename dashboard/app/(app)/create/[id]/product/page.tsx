import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { ProductBrief } from "./product-brief";

export default async function ProductStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("product_id, product_name, target_audience, customer_issues, benefits, runtime, captions")
    .eq("id", id)
    .single();

  const product = project?.product_id
    ? (
        await supabase
          .from("products")
          .select("id, source_url, scrape_status, name, description, images, error")
          .eq("id", project.product_id)
          .maybeSingle()
      ).data
    : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="rise flex flex-col gap-3">
        <span className="overline">Step 02 · Product</span>
        <h1 className="text-4xl font-medium tracking-tight">
          Tell us what you&apos;re <Accent>selling.</Accent>
        </h1>
        <p className="text-muted max-w-xl">
          Drop in a product URL — we&apos;ll pull the page so you don&apos;t have to retype it. Edit anything the scrape gets wrong; this is the brief the rest of the workflow reads.
        </p>
      </header>

      {/* key forces a re-seed of the brief whenever a scrape completes
          (status flips to ready) or the scraped name changes. Re-scrape =
          intentional reset, so losing in-progress edits is acceptable. */}
      <ProductBrief
        key={`${product?.id ?? "none"}:${product?.scrape_status ?? "none"}:${product?.name ?? ""}`}
        projectId={id}
        project={project!}
        product={product ?? null}
      />
    </div>
  );
}
