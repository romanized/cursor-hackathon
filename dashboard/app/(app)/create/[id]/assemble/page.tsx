import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { AssemblePanel } from "./assemble-panel";

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
          Combines the clip list with the voiceover into the final cut. Swap this for a real renderer (FFmpeg/Remotion) without changing the rest of the flow.
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
