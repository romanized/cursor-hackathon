"use client";

import { clsx } from "cnfast";

// Pill toggle: two/three segments, controlled.
export function SegmentToggle<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      className={clsx(
        "inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1",
        size === "sm" ? "text-xs" : "text-sm",
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onChange(opt.value)}
            className={clsx(
              "rounded-full transition-colors duration-150",
              size === "sm" ? "px-3 py-1.5" : "px-4 py-2",
              active
                ? "bg-[var(--color-accent)] text-white"
                : "text-muted hover:text-text",
              opt.disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
