"use client";

import { Button } from "@/components/ui/button";
import { SegmentToggle } from "@/components/ui/toggle";
import { setTemplate } from "@/lib/actions/projects";
import {
  ArrowRight02Icon,
  CrownIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { clsx } from "cnfast";
import { useState, useTransition } from "react";

type Template = {
  id: string;
  name: string;
  kind: "video" | "slideshow";
  status: "active" | "soon" | "hidden";
  description: string | null;
  featured: boolean;
};

export function TemplatePicker({
  projectId,
  initialTemplate,
  initialMediaType,
  templates,
}: {
  projectId: string;
  initialTemplate: string | null;
  initialMediaType: "video" | "slideshow";
  templates: Template[];
}) {
  const [mediaType, setMediaType] = useState<"video" | "slideshow">(
    initialMediaType
  );
  const [selected, setSelected] = useState<string | null>(initialTemplate);
  const [pending, start] = useTransition();

  const filtered = templates.filter((t) => t.kind === mediaType);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <SegmentToggle
          value={mediaType}
          onChange={setMediaType}
          options={[
            { value: "video", label: "Video" },
            { value: "slideshow", label: "Slideshow" },
          ]}
        />
        <span className="text-xs text-muted">
          {filtered.length} format{filtered.length === 1 ? "" : "s"} available
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t, i) => {
          const isSoon = t.status === "soon";
          const isSelected = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={isSoon}
              onClick={() => setSelected(t.id)}
              style={{ ["--i" as string]: i }}
              className={clsx(
                "rise group relative flex aspect-[3/4] flex-col justify-between rounded-[var(--radius-xl)] border p-5 text-left transition-all duration-200",
                isSelected
                  ? "border-[var(--color-accent)] bg-[rgba(239,68,68,0.06)] shadow-[var(--shadow-glow)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]",
                isSoon && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="overline-muted">
                    {t.featured ? "Most used" : "Format"}
                  </span>
                  <h3 className="text-xl font-medium tracking-tight">
                    {t.name}
                  </h3>
                </div>
                {t.featured && !isSoon && (
                  <span className="grid size-8 place-items-center rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                    <HugeiconsIcon
                      icon={CrownIcon}
                      size={16}
                      strokeWidth={1.6}
                    />
                  </span>
                )}
              </div>

              <div className="mt-auto">
                {t.description && (
                  <p className="mb-3 text-sm text-muted leading-relaxed line-clamp-3">
                    {t.description}
                  </p>
                )}
                {isSoon ? (
                  <span className="overline-muted">Coming soon</span>
                ) : isSelected ? (
                  <span className="overline">Selected</span>
                ) : (
                  <span className="text-xs text-faint">Click to choose</span>
                )}
              </div>

              {isSelected && (
                <span className="absolute right-4 top-4 grid size-7 place-items-center rounded-full bg-[var(--color-accent)] text-white">
                  <HugeiconsIcon
                    icon={SparklesIcon}
                    size={14}
                    strokeWidth={1.8}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          intent="primary"
          size="lg"
          disabled={!selected || pending}
          onClick={() =>
            selected && start(() => setTemplate(projectId, selected, mediaType))
          }
        >
          {pending ? "Saving…" : "Continue"}
          <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
