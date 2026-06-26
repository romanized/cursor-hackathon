"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  Mic01Icon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateVoiceover } from "@/lib/actions/voice";
import { advanceTo } from "@/lib/actions/projects";
import type { VoiceOption } from "@/lib/providers/elevenlabs";

export function VoicePanel({
  projectId,
  script,
  voice,
  voices,
  selectedVoiceId,
}: {
  projectId: string;
  script: string;
  voice: { status: "pending" | "processing" | "ready" | "failed"; url: string | null; error: string | null } | null;
  voices: VoiceOption[];
  selectedVoiceId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(voice?.error ?? null);
  const [running, start] = useTransition();
  const [advancing, startAdvance] = useTransition();

  // Which voice the user wants vs. which one last rendered the audio.
  const [voiceId, setVoiceId] = useState(selectedVoiceId);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ready = voice?.status === "ready" && Boolean(voice.url);
  const stale = ready && voiceId !== selectedVoiceId;
  const chosen = voices.find((v) => v.id === voiceId);

  function preview(v: VoiceOption) {
    if (!v.previewUrl) return;
    const el = audioRef.current ?? new Audio();
    audioRef.current = el;
    if (playingId === v.id) {
      el.pause();
      setPlayingId(null);
      return;
    }
    el.src = v.previewUrl;
    el.onended = () => setPlayingId(null);
    el.play().then(() => setPlayingId(v.id)).catch(() => setPlayingId(null));
  }

  function run() {
    setError(null);
    start(async () => {
      try {
        await generateVoiceover(projectId, voiceId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card className="flex flex-col gap-5 p-6">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elev)] p-4 text-sm leading-relaxed text-muted max-h-72 overflow-auto whitespace-pre-wrap">
          {script || "No script yet — go back to Step 3."}
        </div>

        {ready ? (
          <div className="flex flex-col gap-3">
            <audio controls src={voice!.url!} className="w-full" />
            {stale && (
              <p className="text-xs text-faint">
                Voice changed to <span className="text-text">{chosen?.name}</span> — re-render to
                apply it.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button intent={stale ? "primary" : "secondary"} onClick={run} disabled={running}>
                <HugeiconsIcon icon={RefreshIcon} size={16} strokeWidth={1.5} />
                {running ? "Re-rendering…" : stale ? "Re-render with new voice" : "Re-render"}
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
            {running || voice?.status === "processing"
              ? "Rendering voiceover…"
              : `Render with ${chosen?.name ?? "selected voice"}`}
          </Button>
        )}

        {voice?.status === "failed" && voice.error && (
          <p className="text-sm text-[var(--color-accent-soft)]">{voice.error}</p>
        )}
        {error && <p className="text-sm text-[var(--color-accent-soft)]">{error}</p>}
      </Card>

      <aside className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div className="overline-muted">Choose a voice</div>
          <span className="text-xs text-faint">{voices.length} available</span>
        </div>

        {voices.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-muted">
              Couldn’t load voices. Check <code>ELEVENLABS_API_KEY</code> — the env default voice
              will be used.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2 max-h-[28rem] overflow-auto pr-1">
            {voices.map((v) => {
              const active = v.id === voiceId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoiceId(v.id)}
                  className={`group flex items-start gap-3 rounded-[var(--radius-lg)] border p-3 text-left transition-colors ${
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-surface-elev)]"
                      : "border-[var(--color-border)] hover:bg-[var(--color-surface-elev)]"
                  }`}
                >
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      preview(v);
                    }}
                    aria-label={playingId === v.id ? "Pause preview" : "Play preview"}
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-text hover:border-[var(--color-accent)] disabled:opacity-40"
                  >
                    <HugeiconsIcon
                      icon={playingId === v.id ? PauseIcon : PlayIcon}
                      size={15}
                      strokeWidth={1.5}
                    />
                  </span>

                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-text">
                      <span className="truncate">{v.name}</span>
                      {active && (
                        <HugeiconsIcon
                          icon={CheckmarkCircle02Icon}
                          size={15}
                          strokeWidth={1.5}
                          className="shrink-0 text-[var(--color-accent)]"
                        />
                      )}
                    </span>
                    {v.description && (
                      <span className="line-clamp-2 text-xs text-muted">{v.description}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
}
