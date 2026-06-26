import { Accent } from "@/components/accent";
import { createClient } from "@/lib/supabase/server";
import { AssemblePanel } from "./assemble-panel";

// FFmpeg render can take 5-20s for ~24s of footage. Bump the action ceiling
// so Vercel doesn't kill it mid-encode.
export const maxDuration = 300;

export default async function AssembleStep({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: clips }, { data: voices }, { data: existing }] =
    await Promise.all([
      supabase
        .from("assets")
        .select("id, beat_id")
        .eq("project_id", id)
        .eq("kind", "clip")
        .eq("status", "ready")
        .not("beat_id", "is", null),
      supabase
        .from("assets")
        .select("id, beat_id")
        .eq("project_id", id)
        .eq("kind", "voiceover")
        .eq("status", "ready")
        .not("beat_id", "is", null),
      supabase
        .from("assets")
        .select("id")
        .eq("project_id", id)
        .eq("kind", "final")
        .eq("status", "ready")
        .maybeSingle(),
    ]);

  const clipBeatIds = new Set(
    clips?.map((c) => c.beat_id).filter((id): id is string => Boolean(id))
  );
  const voiceBeatIds = new Set(
    voices?.map((v) => v.beat_id).filter((id): id is string => Boolean(id))
  );
  const hasVoice =
    clipBeatIds.size > 0 &&
    [...clipBeatIds].every((beatId) => voiceBeatIds.has(beatId));

  return (
    <div className="flex flex-col gap-8">
      <header className="rise flex flex-col gap-3">
        <span className="overline">Step 07 · Assemble</span>
        <h1 className="text-4xl font-medium tracking-tight">
          Stitch it <Accent>together.</Accent>
        </h1>
        <p className="text-muted max-w-xl">
          FFmpeg stitches every beat clip and muxes the voiceover into a single
          9:16 MP4. With captions on, VEED via Fal styles and burns them in
          (~10–30s extra).
        </p>
      </header>

      <AssemblePanel
        projectId={id}
        clipCount={clips?.length ?? 0}
        hasVoice={hasVoice}
        hasFinal={Boolean(existing)}
      />
    </div>
  );
}
