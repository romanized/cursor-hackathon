"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, Film01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { assembleFinal } from "@/lib/actions/assemble";

export function AssemblePanel({
  projectId,
  clipCount,
  hasVoice,
  hasFinal,
}: {
  projectId: string;
  clipCount: number;
  hasVoice: boolean;
  hasFinal: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card className="p-6">
      <ul className="mb-4 grid gap-2 text-sm">
        <li className={clipCount ? "text-text" : "text-faint"}>· {clipCount} clip{clipCount === 1 ? "" : "s"} ready</li>
        <li className={hasVoice ? "text-text" : "text-faint"}>· {hasVoice ? "voiceover ready" : "voiceover missing"}</li>
      </ul>
      <Button
        size="lg"
        disabled={!clipCount || !hasVoice || pending}
        onClick={() =>
          start(async () => {
            try {
              await assembleFinal(projectId);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          })
        }
      >
        <HugeiconsIcon icon={Film01Icon} size={18} strokeWidth={1.5} />
        {pending ? "Assembling…" : hasFinal ? "Re-assemble & view" : "Assemble final cut"}
        <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={1.5} />
      </Button>
      {error && <p className="mt-3 text-sm text-[var(--color-accent-soft)]">{error}</p>}
    </Card>
  );
}
