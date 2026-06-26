import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { Card } from "@/components/ui/card";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, source_url, scrape_status, images, updated_at")
    .order("updated_at", { ascending: false })
    .limit(40);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="rise mb-8 flex flex-col gap-2">
        <span className="overline">Products</span>
        <h1 className="text-4xl font-medium tracking-tight">
          Everything you&apos;ve <Accent>scraped.</Accent>
        </h1>
      </header>
      {!products?.length ? (
        <Card className="p-8 text-center text-muted">Nothing scraped yet.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const images = Array.isArray(p.images) ? (p.images as string[]) : [];
            return (
              <Card key={p.id} className="flex flex-col overflow-hidden">
                <div className="relative aspect-video bg-black">
                  {images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={images[0]} alt="" className="size-full object-cover" />
                  )}
                </div>
                <div className="flex flex-col gap-1 p-4">
                  <span className="overline-muted">{p.scrape_status}</span>
                  <span className="text-sm font-medium line-clamp-1">{p.name || "Untitled"}</span>
                  <span className="text-xs text-faint line-clamp-1">{p.source_url}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
