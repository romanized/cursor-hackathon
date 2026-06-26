import { requireServer } from "@/lib/env";
import { ApifyClient } from "apify-client";
import "server-only";

// ---------------------------------------------------------------------------
// Tiered scraping strategy. Each tier is one Apify Actor call. We stop at the
// first tier that returns enough signal (name + (description || images)).
//
//   1. Site-specific Actor (e.g. junglee/Amazon-crawler for amazon.* URLs) —
//      pre-parsed product fields, ~$0.005 per product.
//   2. apify/rag-web-browser, `scrapingTool: "raw-http"` — free, ~2–4s on
//      static pages (most DTC / Shopify storefronts).
//   3. apify/rag-web-browser, `scrapingTool: "browser-playwright"` — free,
//      slower but renders JS for SPAs and bot-walled sites.
//
// Tier 3 is the final fallback; if it also misses, we return whatever it gave.
// ponytail: add more site-specific tiers (bol.com, AliExpress) by pushing onto
// ROUTES; no other code needs to change.
// ---------------------------------------------------------------------------

const RAG_ACTOR = "apify/rag-web-browser";
const AMAZON_ACTOR = "junglee/Amazon-crawler";
const ALIEXPRESS_ACTOR = "devcake/aliexpress-products-scraper";
const EBAY_ACTOR = "delicious_zebu/ebay-product-listing-scraper";
// bol.com: no general-purpose product Actor in the store (2026-06). Falls
// through to rag-web-browser, which handles bol product pages fine.

export type ScrapeResult = {
  runId: string;
  name: string | null;
  description: string | null;
  images: string[];
  raw: unknown;
};

let _client: ApifyClient | null = null;
function client() {
  if (!_client)
    _client = new ApifyClient({ token: requireServer("APIFY_TOKEN") });
  return _client;
}

type Tier = {
  name: string;
  test?: (u: URL) => boolean;
  run: (url: string) => Promise<ScrapeResult>;
};

const TIERS: Tier[] = [
  { name: "amazon",      test: (u) => /(^|\.)amazon\./i.test(u.hostname),     run: runAmazon },
  { name: "aliexpress",  test: (u) => /(^|\.)aliexpress\./i.test(u.hostname), run: runAliexpress },
  { name: "ebay",        test: (u) => /(^|\.)ebay\./i.test(u.hostname),       run: runEbay },
  { name: "rag.http",    run: (url) => runRagWebBrowser(url, "raw-http") },
  { name: "rag.browser", run: (url) => runRagWebBrowser(url, "browser-playwright") },
];

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    throw new Error("invalid URL");
  }

  let lastResult: ScrapeResult | null = null;
  for (const tier of TIERS) {
    if (tier.test && !tier.test(target)) continue;

    const t0 = Date.now();
    try {
      const r = await tier.run(url);
      lastResult = r;
      console.log("[apify]", tier.name, "→", {
        ms: Date.now() - t0,
        name: r.name,
        descChars: r.description?.length ?? 0,
        images: r.images.length,
      });
      if (isGoodEnough(r)) return r;
    } catch (e) {
      console.warn(
        "[apify]",
        tier.name,
        "failed",
        e instanceof Error ? e.message : e
      );
    }
  }

  // No tier hit the good-enough bar — return the last attempt so the user at
  // least sees what came back, and can edit the brief manually.
  if (lastResult) return lastResult;
  throw new Error("all scraping tiers failed");
}

function isGoodEnough(r: ScrapeResult): boolean {
  return Boolean(r.name && (r.description || r.images.length));
}

// ---------------------------------------------------------------------------
// Tier 1 — junglee/Amazon-crawler. Pre-parsed product fields.
// ---------------------------------------------------------------------------

async function runAmazon(url: string): Promise<ScrapeResult> {
  const run = await client()
    .actor(AMAZON_ACTOR)
    .call({
      categoryOrProductUrls: [{ url }],
      maxItemsPerStartUrl: 1,
      scrapeProductDetails: true,
      scrapeSellers: false,
      useCaptchaSolver: false,
    });
  const { items } = await client()
    .dataset(run.defaultDatasetId)
    .listItems({ limit: 1 });
  const item = (items[0] ?? {}) as Record<string, unknown>;

  const name = pickString(item, ["title", "name"]);
  const description = pickString(item, [
    "description",
    "productDescription",
    "features",
  ]);
  const images = collectImages([
    item.images,
    item.galleryThumbnails,
    item.thumbnailImage,
    item.image,
    item.featuredImage,
  ]);

  return {
    runId: run.id,
    name,
    description,
    images,
    raw: { tier: "amazon", ...item },
  };
}

// ---------------------------------------------------------------------------
// Tier 2 — devcake/aliexpress-products-scraper. Takes product URLs directly.
// ---------------------------------------------------------------------------

async function runAliexpress(url: string): Promise<ScrapeResult> {
  const run = await client().actor(ALIEXPRESS_ACTOR).call({
    productUrls: [{ url }],
    maxProducts: 1,
  });
  const { items } = await client().dataset(run.defaultDatasetId).listItems({ limit: 1 });
  const item = (items[0] ?? {}) as Record<string, unknown>;

  const name = pickString(item, ["title", "name", "productTitle"]);
  const description = pickString(item, ["description", "productDescription", "subject"]);
  const images = collectImages([
    item.images,
    item.imageUrls,
    item.gallery,
    item.thumbnail,
    item.image,
  ]);

  return { runId: run.id, name, description, images, raw: { tier: "aliexpress", ...item } };
}

// ---------------------------------------------------------------------------
// Tier 3 — delicious_zebu/ebay-product-listing-scraper. Takes listing URLs.
// ---------------------------------------------------------------------------

async function runEbay(url: string): Promise<ScrapeResult> {
  const run = await client().actor(EBAY_ACTOR).call({
    listingUrls: [{ url }],
  });
  const { items } = await client().dataset(run.defaultDatasetId).listItems({ limit: 1 });
  const item = (items[0] ?? {}) as Record<string, unknown>;

  const name = pickString(item, ["title", "name", "itemTitle"]);
  const description = pickString(item, ["description", "itemDescription", "subtitle"]);
  const images = collectImages([
    item.images,
    item.imageUrls,
    item.pictures,
    item.gallery,
    item.image,
  ]);

  return { runId: run.id, name, description, images, raw: { tier: "ebay", ...item } };
}

// ---------------------------------------------------------------------------
// Tiers 4 & 5 — apify/rag-web-browser (free Actor) with chosen scrapingTool.
// ---------------------------------------------------------------------------

async function runRagWebBrowser(
  url: string,
  scrapingTool: "raw-http" | "browser-playwright"
): Promise<ScrapeResult> {
  const run = await client()
    .actor(RAG_ACTOR)
    .call({
      query: url,
      maxResults: 1,
      outputFormats: ["markdown"],
      scrapingTool,
      htmlTransformer: "readable",
      removeCookieWarnings: true,
      requestTimeoutSecs: scrapingTool === "raw-http" ? 15 : 35,
    });
  const { items } = await client()
    .dataset(run.defaultDatasetId)
    .listItems({ limit: 1 });
  const item = (items[0] ?? {}) as Record<string, unknown>;
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;

  const name = pickString(metadata, ["title"]) ?? pickString(item, ["title"]);
  const description = pickString(metadata, ["description"]);

  // Image extraction: markdown image syntax + any direct CDN URLs in the body.
  const images = new Set<string>();
  const md = pickString(item, ["markdown"]) ?? "";
  for (const m of md.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) {
    images.add(absolutize(m[1], url) ?? m[1]);
  }
  // Fallback raw URL sweep — handles markdown engines that linkify bare URLs.
  for (const m of md.matchAll(
    /https?:\/\/\S+?\.(?:jpe?g|png|webp|gif)(?:\?[^\s)"']*)?/gi
  )) {
    images.add(m[0]);
  }

  return {
    runId: run.id,
    name,
    description,
    images: [...images].slice(0, 12),
    raw: { tier: `rag.${scrapingTool}`, metadata, markdownChars: md.length },
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function pickString(
  src: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const k of keys) {
    const v = src[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (Array.isArray(v) && v.length && typeof v[0] === "string")
      return v.join(" · ");
  }
  return null;
}

function collectImages(sources: unknown[]): string[] {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (!v) return;
    if (typeof v === "string") {
      out.add(v);
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }
    if (typeof v === "object") {
      const url =
        (v as Record<string, unknown>).url ??
        (v as Record<string, unknown>).large ??
        (v as Record<string, unknown>).src;
      if (typeof url === "string") out.add(url);
    }
  };
  for (const s of sources) walk(s);
  return [...out].slice(0, 12);
}

function absolutize(maybeUrl: string, base: string): string | null {
  try {
    return new URL(maybeUrl, base).href;
  } catch {
    return null;
  }
}
