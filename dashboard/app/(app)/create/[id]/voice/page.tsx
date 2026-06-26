import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { Accent } from "@/components/accent";
import { listAvailableVoices } from "@/lib/actions/voice";
import { VoicePanel } from "./voice-panel";

export default async function VoiceStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: voice }, voices] = await Promise.all([
    supabase.from("projects").select("voiceover_script, meta").eq("id", id).single(),
    supabase
      .from("assets")
      .select("status, url, error")
      .eq("project_id", id)
      .eq("kind", "voiceover")
      .is("beat_id", null)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    listAvailableVoices().catch(() => []),
  ]);

  const meta = (project?.meta ?? {}) as Record<string, unknown>;
  const selectedVoiceId =
    typeof meta.voice_id === "string" ? meta.voice_id : env.ELEVENLABS_VOICE_ID;

  return (
    <div className="flex flex-col gap-8">
      <header className="rise flex flex-col gap-3">
        <span className="overline">Step 05 · Voice</span>
        <h1 className="text-4xl font-medium tracking-tight">
          Bring the script to <Accent>life.</Accent>
        </h1>
        <p className="text-muted max-w-xl">
          Pick a voice, preview it, then let ElevenLabs read your script. Re-render any time you
          tweak copy or switch voices.
        </p>
      </header>

      <VoicePanel
        projectId={id}
        script={project?.voiceover_script ?? ""}
        voice={voice ?? null}
        voices={voices}
        selectedVoiceId={selectedVoiceId}
      />
    </div>
  );
}
