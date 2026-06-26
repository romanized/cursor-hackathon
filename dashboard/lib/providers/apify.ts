import "server-only";
import { ApifyClient } from "apify-client";
import { requireServer } from "@/lib/env";

// Generic Actor picked via the apify-ultimate-scraper skill (`search-actors`).
// `apify/website-content-crawler` works on any URL and returns markdown + metadata.
// Swap to a site-specific actor (e.g. junglee/Amazon) here if a URL needs it.
const ACTOR_ID = "apify/website-content-crawler";

export type ScrapeResult = {
  runId: string;
  name: string | null;
  description: string | null;
  images: string[];
  raw: unknown;
};

let _client: ApifyClient | null = null;
function client() {
  if (!_client) _client = new ApifyClient({ token: requireServer("APIFY_TOKEN") });
  return _client;
}

/**
 * Scrape a product/landing page. Best-effort image extraction: openGraph image
 * + any markdown image URLs in the body. The user fills brief copy manually.
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  console.log("[apify] scraping", { url, actor: ACTOR_ID });

  const run = await client().actor(ACTOR_ID).call({
    startUrls: [{ url }],
    maxCrawlPages: 1,
    saveScreenshots: false,
    htmlTransformer: "readableText",
  });

  console.log("[apify] run done", { runId: run.id, status: run.status, datasetId: run.defaultDatasetId });

  const { items } = await client().dataset(run.defaultDatasetId).listItems({ limit: 1 });
  const item = (items[0] ?? {}) as Record<string, unknown>;

  console.log("[apify] item keys", Object.keys(item));
  // Full item dump — truncate text/markdown so the log doesn't explode.
  console.log(
    "[apify] item",
    JSON.stringify(
      item,
      (k, v) => (typeof v === "string" && v.length > 400 ? `${v.slice(0, 400)}…(${v.length} chars)` : v),
      2,
    ),
  );

  const metadata = (item.metadata ?? {}) as Record<string, unknown>;

  // openGraph is an array of { property, content }. Flatten to {og:title, og:image, ...}.
  const og: Record<string, string> = {};
  for (const entry of (metadata.openGraph as Array<Record<string, unknown>>) ?? []) {
    const p = str(entry.property);
    const c = str(entry.content);
    if (p && c) og[p] = c;
  }

  // jsonLd is the cleanest source on product pages — schema.org Product.
  // Apify nests it as jsonLd[group][index] so flatten and find the first Product.
  const jsonLdFlat: Array<Record<string, unknown>> = [];
  for (const group of (metadata.jsonLd as unknown[]) ?? []) {
    if (Array.isArray(group)) {
      for (const it of group) if (it && typeof it === "object") jsonLdFlat.push(it as Record<string, unknown>);
    } else if (group && typeof group === "object") {
      jsonLdFlat.push(group as Record<string, unknown>);
    }
  }
  const product = jsonLdFlat.find((j) => str(j["@type"])?.toLowerCase() === "product") ?? {};

  const name =
    str(product.name) ||
    str(metadata.title) ||
    str(item.title) ||
    str(og["og:title"]) ||
    null;

  const description =
    str(product.description) ||
    str(metadata.description) ||
    str(og["og:description"]) ||
    (str(item.text) ? str(item.text)!.slice(0, 400) : null);

  const images = new Set<string>();
  // 1. JSON-LD Product.image — string or string[]
  const ldImg = product.image;
  if (typeof ldImg === "string") images.add(ldImg);
  else if (Array.isArray(ldImg)) for (const u of ldImg) if (typeof u === "string") images.add(u);
  // 2. Open Graph image
  if (og["og:image"]) images.add(og["og:image"]);
  // 3. Markdown image syntax sweep
  const md = str(item.markdown);
  if (md) {
    for (const m of md.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) images.add(m[1]);
  }
  // 4. Last resort: raw text URL sweep
  const txt = str(item.text);
  if (txt) {
    for (const m of txt.matchAll(/https?:\/\/\S+\.(?:jpe?g|png|webp|gif)(?:\?[^\s)"']*)?/gi)) {
      images.add(m[0]);
    }
  }

  const result = {
    runId: run.id,
    name,
    description,
    images: [...images].slice(0, 12),
    raw: item,
  };
  console.log("[apify] parsed", {
    name: result.name,
    descChars: result.description?.length ?? 0,
    images: result.images.length,
  });
  return result;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}
