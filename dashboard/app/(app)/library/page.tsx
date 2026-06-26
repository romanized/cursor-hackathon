import Link from "next/link";

import { Accent } from "@/components/accent";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { stepFromNumber } from "@/lib/steps";
import { createClient } from "@/lib/supabase/server";

// Library is a per-user view — cookies-bound supabase client makes the page
// dynamic, but make it explicit so nothing tries to cache it.
export const dynamic = "force-dynamic";

const isVideoUrl = (url: string | null | undefined) =>
  Boolean(url) && /\.(mp4|webm|mov)(\?|$)/i.test(url ?? "");

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: drafts, error: draftsErr } = await supabase
    .from("projects")
    .select("id, title, product_name, status, current_step, updated_at")
    .order("updated_at", { ascending: false })
    .limit(60);
  console.log("[library]", {
    userId: user?.id ?? null,
    drafts: drafts?.length ?? 0,
    error: draftsErr?.message ?? null,
  });

  // Pull the latest preview asset per project (final mp4 if ready, else first
  // ready beat image). One query, joined client-side — way cheaper than N+1.
  const projectIds = drafts?.map((d) => d.id) ?? [];
  const { data: assets } = projectIds.length
    ? await supabase
        .from("assets")
        .select("project_id, kind, url, created_at, status")
        .in("project_id", projectIds)
        .in("kind", ["final", "image"])
        .eq("status", "ready")
        .order("created_at", { ascending: false })
    : { data: [] };

  const previewByProject = new Map<string, { url: string; isVideo: boolean }>();
  for (const a of assets ?? []) {
    if (!a.url || previewByProject.has(a.project_id)) continue;
    // Walks newest-first; prefer final mp4 by inserting it but also accept
    // any image as a fallback for projects still mid-flow.
    if (a.kind === "final" || a.kind === "image") {
      previewByProject.set(a.project_id, {
        url: a.url,
        isVideo: isVideoUrl(a.url),
      });
    }
  }
  // Re-walk to upgrade image previews to final mp4 when both exist.
  for (const a of assets ?? []) {
    if (a.kind === "final" && a.url) {
      previewByProject.set(a.project_id, {
        url: a.url,
        isVideo: isVideoUrl(a.url),
      });
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="rise mb-8 flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <span className="overline">Library</span>
          <h1 className="text-4xl font-medium tracking-tight">
            Your <Accent>drafts</Accent> and films
          </h1>
        </div>
        <Link href="/create">
          <Button intent="primary">New project</Button>
        </Link>
      </header>

      {!drafts?.length ? (
        <Card className="p-8 text-center text-muted">
          Nothing here yet.{" "}
          <Link className="text-text underline" href="/create">
            Start your first project →
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drafts.map((d) => {
            const step = stepFromNumber(d.current_step);
            const stepNum = step.idx;
            const preview = previewByProject.get(d.id);
            const isDone = d.status === "ready";
            const href = isDone
              ? `/create/${d.id}/film`
              : `/create/${d.id}/${step.slug}`;

            return (
              <Link key={d.id} href={href} className="group">
                <Card className="flex flex-col overflow-hidden p-0 transition-colors hover:border-[var(--color-border-strong)]">
                  <div className="relative aspect-[9/16] bg-black">
                    {preview ? (
                      preview.isVideo ? (
                        <video
                          src={preview.url}
                          className="size-full object-cover"
                          muted
                          loop
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview.url}
                          alt=""
                          className="size-full object-cover"
                        />
                      )
                    ) : (
                      <div className="grid size-full place-items-center text-xs uppercase tracking-widest text-faint">
                        No preview yet
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/90">
                      {isDone
                        ? "Ready"
                        : `Step ${String(stepNum).padStart(2, "0")} · ${
                            step.label
                          }`}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-sm font-medium">
                        {d.title || d.product_name || "Untitled draft"}
                      </span>
                      <span className="text-[11px] text-faint">
                        {new Date(d.updated_at).toLocaleString()}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100">
                      {isDone ? "Play →" : "Resume →"}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
