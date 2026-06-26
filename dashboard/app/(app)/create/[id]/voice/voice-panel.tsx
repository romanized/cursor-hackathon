"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, Mic01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateVoiceover } from "@/lib/actions/voice";
import { advanceTo } from "@/lib/actions/projects";

export function VoicePanel({
  projectId,
  script,
  voice,
}: {
  projectId: string;
  script: string;
  voice: { status: "pending" | "processing" | "ready" | "failed"; url: string | null; error: string | null } | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(voice?.error ?? null);
  const [running, start] = useTransition();
  const [advancing, startAdvance] = useTransition();

  function run() {
    setError(null);
    start(async () => {
      try {
        await generateVoiceover(projectId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="flex flex-col gap-5 p-6">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elev)] p-4 text-sm leading-relaxed text-muted max-h-72 overflow-auto whitespace-pre-wrap">
          {script || "No script yet — go back to Step 3."}
        </div>

        {voice?.status === "ready" && voice.url ? (
          <div className="flex flex-col gap-3">
            <audio controls src={voice.url} className="w-full" />
            <div className="flex flex-wrap items-center gap-3">
              <Button intent="secondary" onClick={run} disabled={running}>
                <HugeiconsIcon icon={RefreshIcon} size={16} strokeWidth={1.5} />
                {running ? "Re-rendering…" : "Re-render"}
              </Button>
              <Button
                onClick={() => startAdvance(() => advanceTo(projectId, 6, "clips"))}
                disabled={advancing}
              >
                {advancing ? "Saving…" : "Continue to clips"}
                <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        ) : (
          <Button intent="primary" size="lg" onClick={run} disabled={running || !script}>
            <HugeiconsIcon icon={Mic01Icon} size={18} strokeWidth={1.5} />
            {running || voice?.status === "processing" ? "Rendering voiceover…" : "Render voiceover"}
          </Button>
        )}

        {voice?.status === "failed" && voice.error && (
          <p className="text-sm text-[var(--color-accent-soft)]">{voice.error}</p>
        )}
        {error && <p className="text-sm text-[var(--color-accent-soft)]">{error}</p>}
      </Card>

      <aside className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="overline-muted mb-2">Voice</div>
          <p className="text-sm text-text">eleven_turbo_v2_5</p>
          <p className="mt-1 text-xs text-faint">
            Change <code>ELEVENLABS_VOICE_ID</code> in your env to swap voices.
          </p>
        </Card>
      </aside>
    </div>
  );
}
