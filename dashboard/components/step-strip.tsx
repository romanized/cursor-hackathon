"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "cnfast";

import { STEPS, type StepSlug } from "@/lib/steps";

// Re-export so existing client-side imports keep working without churn.
export { STEPS, stepFromSlug, stepFromNumber, type StepSlug } from "@/lib/steps";

export function StepStrip({
  projectId,
  furthest,
}: {
  projectId: string;
  furthest: number; // projects.current_step — gates forward navigation
}) {
  const path = usePathname() ?? "";
  const match = path.match(/\/create\/[^/]+\/([^/?#]+)/);
  const active = (match?.[1] as StepSlug) || "template";
  return (
    <div className="relative">
      <div className="absolute left-6 right-6 top-[18px] h-px bg-[var(--color-border)]" />
      <ol className="no-scrollbar relative flex gap-6 overflow-x-auto px-2 py-2">
        {STEPS.map((step) => {
          const state =
            step.slug === active
              ? "active"
              : step.idx < furthest
                ? "done"
                : step.idx <= furthest
                  ? "available"
                  : "locked";
          const disabled = state === "locked";
          return (
            <li key={step.slug} className="flex min-w-[88px] flex-1 flex-col items-center text-center">
              {disabled ? (
                <div className="pointer-events-none flex flex-col items-center gap-2 opacity-40">
                  <Dot state={state} idx={step.idx} />
                  <Labels {...step} state={state} />
                </div>
              ) : (
                <Link
                  href={`/create/${projectId}/${step.slug}`}
                  className="group flex flex-col items-center gap-2"
                >
                  <Dot state={state} idx={step.idx} />
                  <Labels {...step} state={state} />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Dot({ state, idx }: { state: "active" | "done" | "available" | "locked"; idx: number }) {
  return (
    <div
      className={clsx(
        "grid size-9 place-items-center rounded-full border text-[12px] font-semibold transition-colors",
        state === "active" && "border-[var(--color-accent)] bg-[var(--color-accent)] text-white pulse-coral",
        state === "done" && "border-[var(--color-accent-dim)] bg-[var(--color-accent-dim)]/30 text-[var(--color-accent-soft)]",
        state === "available" && "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-muted group-hover:text-text",
        state === "locked" && "border-[var(--color-border)] bg-[var(--color-surface)] text-faint",
      )}
    >
      {idx.toString().padStart(2, "0")}
    </div>
  );
}

function Labels({
  label,
  caption,
  state,
}: {
  label: string;
  caption: string;
  state: "active" | "done" | "available" | "locked";
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={clsx(
          "text-[12px] font-medium",
          state === "active" ? "text-text" : "text-muted",
        )}
      >
        {label}
      </span>
      <span className="overline-muted mt-1 text-[10px]">{caption}</span>
    </div>
  );
}
