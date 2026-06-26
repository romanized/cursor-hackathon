"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, Link02Icon, Tick02Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SegmentToggle } from "@/components/ui/toggle";
import { CreditPill } from "@/components/ui/credit-pill";
import { scrapeAndAttach } from "@/lib/actions/products";
import { saveBrief } from "@/lib/actions/projects";
import {
  DEFAULT_SUBTITLE_PRESET,
  parseSubtitlePreset,
  VEED_SUBTITLE_PRESET_GROUPS,
  type VeedSubtitlePreset,
} from "@/lib/media/subtitle-presets";
import type { Json } from "@/lib/db";

type Project = {
  product_id: string | null;
  product_name: string | null;
  target_audience: string | null;
  customer_issues: string[];
  benefits: string[];
  runtime: "hook" | "full";
  captions: boolean;
  meta: Json;
};

type Product = {
  id: string;
  source_url: string | null;
  scrape_status: "pending" | "processing" | "ready" | "failed";
  name: string | null;
  description: string | null;
  images: unknown;
  error: string | null;
};

export function ProductBrief({
  projectId,
  project,
  product,
}: {
  projectId: string;
  project: Project;
  product: Product | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(product?.source_url ?? "");
  const [scraping, startScrape] = useTransition();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(product?.error ?? null);

  // Brief fields — seeded from project + product.
  const [name, setName] = useState(project.product_name ?? product?.name ?? "");
  const [audience, setAudience] = useState(project.target_audience ?? "");
  const [issues, setIssues] = useState(project.customer_issues.join("\n"));
  const [benefits, setBenefits] = useState(project.benefits.join("\n"));
  const [runtime, setRuntime] = useState<"hook" | "full">(project.runtime);
  const [captions, setCaptions] = useState(project.captions);
  const [captionPreset, setCaptionPreset] = useState<VeedSubtitlePreset>(() => {
    const meta = project.meta;
    const raw =
      meta && typeof meta === "object" && !Array.isArray(meta)
        ? (meta as Record<string, unknown>).caption_preset
        : undefined;
    return parseSubtitlePreset(raw);
  });

  const images = Array.isArray(product?.images) ? (product!.images as string[]) : [];

  function runScrape() {
    setError(null);
    startScrape(async () => {
      try {
        await scrapeAndAttach(projectId, url.trim());
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSave(async () => {
      try {
        await saveBrief(projectId, {
          product_name: name.trim(),
          target_audience: audience.trim(),
          customer_issues: issues,
          benefits,
          runtime,
          captions,
          caption_preset: captionPreset,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Left column — brief fields */}
      <div className="flex flex-col gap-5">
        <Card className="p-5">
          <label className="overline-muted mb-3 block">Source URL</label>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elev)] px-3">
              <HugeiconsIcon icon={Link02Icon} size={16} strokeWidth={1.5} className="text-faint" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                type="url"
                placeholder="https://amazon.com/dp/…"
                className="h-11 flex-1 bg-transparent outline-none text-sm"
              />
            </div>
            <Button
              type="button"
              intent={product?.scrape_status === "ready" ? "secondary" : "primary"}
              onClick={runScrape}
              disabled={!url || scraping}
            >
              <HugeiconsIcon icon={product?.scrape_status === "ready" ? RefreshIcon : ArrowRight02Icon} size={16} strokeWidth={1.5} />
              {scraping ? "Scraping…" : product?.scrape_status === "ready" ? "Re-scrape" : "Scrape"}
            </Button>
          </div>
          {product?.scrape_status && (
            <p className="mt-3 text-xs text-muted">
              Status: <span className={product.scrape_status === "ready" ? "text-[var(--color-accent-soft)]" : "text-text"}>{product.scrape_status}</span>
              {product.description && product.scrape_status === "ready" && (
                <> — pulled <strong className="text-text">{(product.description ?? "").length}</strong> chars + <strong className="text-text">{images.length}</strong> image{images.length === 1 ? "" : "s"}.</>
              )}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <div className="overline-muted mb-4">Brief editor</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aurora Sleep Mask" required />
            </Field>
            <Field label="Target audience">
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Sleep-deprived knowledge workers" />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Customer issues" hint="One per line">
              <Textarea value={issues} onChange={(e) => setIssues(e.target.value)} placeholder={"Can\u2019t fall asleep on flights\nLight leaks at the nose"} />
            </Field>
            <Field label="Benefits" hint="One per line">
              <Textarea value={benefits} onChange={(e) => setBenefits(e.target.value)} placeholder={"100% blackout\n3D contour fit\nMachine washable"} />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <div className="overline-muted mb-4">Runtime & polish</div>
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Runtime</span>
              <SegmentToggle
                value={runtime}
                onChange={setRuntime}
                options={[
                  { value: "hook", label: "Hook · 1 credit" },
                  { value: "full", label: "Full ad · 3 credits" },
                ]}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={captions}
                onChange={(e) => setCaptions(e.target.checked)}
                className="size-4 accent-[var(--color-accent)]"
              />
              Burned-in captions
            </label>
            <CreditPill amount={runtime === "hook" ? 1 : 3} className="ml-auto" />
          </div>
          {captions && (
            <div className="mt-4 flex flex-col gap-2">
              <span className="text-xs text-muted">Caption style</span>
              <select
                value={captionPreset}
                onChange={(e) => setCaptionPreset(parseSubtitlePreset(e.target.value))}
                className="h-11 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elev)] px-3 text-sm outline-none"
              >
                {VEED_SUBTITLE_PRESET_GROUPS.map((group) => (
                  <optgroup key={group.tier} label={group.label}>
                    {group.presets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-faint">
                Styled via VEED on Fal. Default: {DEFAULT_SUBTITLE_PRESET}.
              </p>
            </div>
          )}
        </Card>

        <div className="flex items-center justify-end gap-3">
          {error && <p className="mr-auto text-sm text-[var(--color-accent-soft)]">{error}</p>}
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "Saving…" : "Save brief & continue"}
            <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      {/* Right column — scrape preview */}
      <aside className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="overline-muted mb-3">Scrape preview</div>
          {product?.scrape_status === "ready" ? (
            <div className="flex flex-col gap-3">
              {images[0] && (
                <div className="relative aspect-video overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={images[0]} alt="" className="size-full object-cover" />
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {images.slice(1, 7).map((src) => (
                  <div key={src} className="relative size-12 overflow-hidden rounded-md border border-[var(--color-border)] bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="size-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted line-clamp-6 leading-relaxed">
                {product.description || "No description captured."}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-accent-soft)]">
                <HugeiconsIcon icon={Tick02Icon} size={14} /> Ready to use in brief
              </div>
            </div>
          ) : product?.scrape_status === "processing" ? (
            <p className="text-sm text-muted">Apify is reading the page…</p>
          ) : product?.scrape_status === "failed" ? (
            <p className="text-sm text-[var(--color-accent-soft)]">Scrape failed — {product.error}</p>
          ) : (
            <p className="text-sm text-muted">Paste a URL on the left and press Scrape. Or skip and fill the brief by hand.</p>
          )}
        </Card>
      </aside>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-muted">
        {label}
        {hint && <span className="ml-2 text-xs text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
