import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { Card } from "@/components/ui/card";
import { Slideshow } from "./slideshow";

export default async function FilmStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: final } = await supabase
    .from("assets")
    .select("id, url, meta")
    .eq("project_id", id)
    .eq("kind", "final")
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const meta = (final?.meta ?? {}) as {
    kind?: "rendered_mp4" | "slideshow";
    clips?: Array<{ id: string; url: string | null }>;
    voice?: { id: string; url: string | null };
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="rise flex flex-col gap-3">
        <span className="overline">Step 08 · Film</span>
        <h1 className="text-4xl font-medium tracking-tight">
          Your <Accent>footage.</Accent>
        </h1>
        <p className="text-muted max-w-xl">
          {meta.kind === "rendered_mp4"
            ? "Single MP4 with the voiceover baked in. Download or share."
            : "Press play. Download the voiceover from your audio player; the clip strip below is the visual storyboard."}
        </p>
      </header>

      {!final ? (
        <Card className="p-6 text-sm text-muted">
          Nothing assembled yet. <Link href={`/create/${id}/assemble`} className="text-text underline">Go to Step 07</Link>.
        </Card>
      ) : meta.kind === "rendered_mp4" && final.url ? (
        <Card className="overflow-hidden">
          <div className="relative aspect-[9/16] max-h-[640px] bg-black">
            <video
              src={final.url}
              className="size-full object-contain"
              controls
              playsInline
            />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] p-4 text-xs text-muted">
            <span>Rendered MP4 · 9:16 · voiceover baked in</span>
            <a href={final.url} download className="text-text underline">Download .mp4</a>
          </div>
        </Card>
      ) : (
        <Slideshow clips={meta.clips ?? []} voiceUrl={meta.voice?.url ?? null} />
      )}
    </div>
  );
}
