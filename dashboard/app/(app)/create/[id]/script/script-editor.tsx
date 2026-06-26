"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowRight02Icon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CreditPill } from "@/components/ui/credit-pill";
import { generateScriptForProject, saveScript } from "@/lib/actions/projects";

type Beat = { idx: number; label: string | null; text: string; visual_prompt: string | null };

export function ScriptEditor({
  projectId,
  project,
  initialBeats,
}: {
  projectId: string;
  project: {
    voiceover_script: string | null;
    runtime: "hook" | "full";
    product_name: string | null;
    customer_issues: string[];
    benefits: string[];
    target_audience: string | null;
  };
  initialBeats: Beat[];
}) {
  const [script, setScript] = useState(project.voiceover_script ?? "");
  const [beats, setBeats] = useState<Array<{ label: string; text: string; visual_prompt: string }>>(
    initialBeats.length
      ? initialBeats.map((b) => ({ label: b.label ?? "", text: b.text, visual_prompt: b.visual_prompt ?? "" }))
      : [
          { label: "Hook", text: "", visual_prompt: "" },
          { label: "Problem", text: "", visual_prompt: "" },
          { label: "Reveal", text: "", visual_prompt: "" },
          { label: "CTA", text: "", visual_prompt: "" },
        ],
  );
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [aiPending, startAi] = useTransition();

  function runGenerate() {
    setError(null);
    startAi(async () => {
      try {
        await generateScriptForProject(projectId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function update(i: number, patch: Partial<(typeof beats)[number]>) {
    setBeats((cur) => cur.map((b, j) => (i === j ? { ...b, ...patch } : b)));
  }
  function add() {
    setBeats((cur) => [...cur, { label: "", text: "", visual_prompt: "" }]);
  }
  function remove(i: number) {
    setBeats((cur) => cur.filter((_, j) => j !== i));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!script.trim()) {
      setError("Voiceover script is required");
      return;
    }
    const cleaned = beats.filter((b) => b.text.trim());
    if (!cleaned.length) {
      setError("Add at least one beat");
      return;
    }
    setError(null);
    start(async () => {
      try {
        await saveScript(projectId, { voiceover_script: script, beats: cleaned });
      } catch (e) {
        setError(
          e instanceof Error && e.message === "insufficient_credits"
            ? "Not enough credits — subscribe in the sidebar."
            : e instanceof Error ? e.message : String(e),
        );
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5">
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex flex-col gap-1">
            <span className="overline-muted">Write with AI</span>
            <p className="text-sm text-muted">
              Gemini drafts a {project.runtime === "hook" ? "6-beat hook" : "10-beat full ad"} from your brief. Overwrites whatever&apos;s here.
            </p>
          </div>
          <Button type="button" intent="primary" onClick={runGenerate} disabled={aiPending}>
            <HugeiconsIcon icon={SparklesIcon} size={16} strokeWidth={1.6} />
            {aiPending ? "Drafting…" : initialBeats.length ? "Re-draft script" : "Draft script"}
          </Button>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="overline-muted">Voiceover script</span>
            <span className="text-xs text-faint">{script.length} chars</span>
          </div>
          <Textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder={`Most people think you need 8 hours.\nBut what if 6 deep ones could replace 9 broken?\nMeet ${project.product_name || "your product"}…`}
            className="min-h-40"
          />
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="overline-muted">Beats</span>
            <Button type="button" intent="ghost" size="sm" onClick={add}>
              <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.8} />
              Add beat
            </Button>
          </div>
          <ol className="flex flex-col gap-4">
            {beats.map((b, i) => (
              <li
                key={i}
                className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elev)] p-4 sm:grid-cols-[60px_1fr_auto]"
              >
                <div className="flex flex-col items-center gap-1 sm:items-start">
                  <span className="grid size-8 place-items-center rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-sm font-medium">
                    {(i + 1).toString().padStart(2, "0")}
                  </span>
                  <Input
                    value={b.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                    placeholder="Hook"
                    className="h-8 px-2 text-xs"
                  />
                </div>
                <div className="grid gap-2">
                  <Textarea
                    value={b.text}
                    onChange={(e) => update(i, { text: e.target.value })}
                    placeholder="Spoken line for this beat"
                    className="min-h-16"
                  />
                  <Input
                    value={b.visual_prompt}
                    onChange={(e) => update(i, { visual_prompt: e.target.value })}
                    placeholder="Visual prompt (CGI skeleton holds product close-up, neon backlight)"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Remove beat"
                  className="self-start text-faint hover:text-[var(--color-accent)]"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ol>
        </Card>

        <div className="flex items-center justify-end gap-3">
          {error && <p className="mr-auto text-sm text-[var(--color-accent-soft)]">{error}</p>}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Saving…" : `Confirm & charge ${project.runtime === "hook" ? "1" : "3"} credit${project.runtime === "hook" ? "" : "s"}`}
            <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="overline-muted mb-3">Brief recap</div>
          <dl className="grid gap-3 text-sm">
            <Row label="Product">{project.product_name || "—"}</Row>
            <Row label="Audience">{project.target_audience || "—"}</Row>
            <Row label="Pains">
              <List items={project.customer_issues} />
            </Row>
            <Row label="Benefits">
              <List items={project.benefits} />
            </Row>
          </dl>
        </Card>
        <Card className="p-5">
          <div className="overline-muted mb-3">Cost</div>
          <CreditPill amount={project.runtime === "hook" ? 1 : 3} />
          <p className="mt-2 text-xs text-muted">
            Charged when you confirm. Voiceover render is free for the same project after that.
          </p>
        </Card>
      </aside>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-wider text-faint">{label}</dt>
      <dd className="text-right text-text">{children}</dd>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  if (!items?.length) return <>—</>;
  return (
    <ul className="flex flex-col gap-0.5 text-xs text-muted">
      {items.slice(0, 4).map((i) => <li key={i}>· {i}</li>)}
      {items.length > 4 && <li className="text-faint">+{items.length - 4} more</li>}
    </ul>
  );
}
