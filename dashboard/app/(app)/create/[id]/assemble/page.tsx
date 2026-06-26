import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { AssemblePanel } from "./assemble-panel";

// FFmpeg render can take 5-20s for ~24s of footage. Bump the action ceiling
// so Vercel doesn't kill it mid-encode.
export const maxDuration = 300;

export default async function AssembleStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: clips }, { data: voice }, { data: existing }] = await Promise.all([
    supabase.from("assets").select("id").eq("project_id", id).eq("kind", "clip").eq("status", "ready"),
    supabase.from("assets").select("id, url").eq("project_id", id).eq("kind", "voiceover").eq("status", "ready").maybeSingle(),
    supabase
      .from("assets")
      .select("id")
      .eq("project_id", id)
      .eq("kind", "final")
      .eq("status", "ready")
      .maybeSingle(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="rise flex flex-col gap-3">
        <span className="overline">Step 07 · Assemble</span>
        <h1 className="text-4xl font-medium tracking-tight">
          Stitch it <Accent>together.</Accent>
        </h1>
        <p className="text-muted max-w-xl">
          FFmpeg stitches every beat clip and bakes the voiceover audio straight into a single 9:16 MP4. Takes 5–20 seconds.
        </p>
      </header>

      <AssemblePanel
        projectId={id}
        clipCount={clips?.length ?? 0}
        hasVoice={Boolean(voice)}
        hasFinal={Boolean(existing)}
      />
    </div>
  );
}
