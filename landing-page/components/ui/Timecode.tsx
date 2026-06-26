import { cn } from "@/lib/utils/cn";

/**
 * A monospaced HUD chip — the "edit suite" detailing.
 *
 * Used for timecodes, model badges, and scrubber-style micro-labels. Always
 * Geist Mono (the project locks ALL such detailing to mono) with tabular figures
 * inherited from the global `.font-mono` rule. Purely presentational; carries no
 * accent so it never competes with the locked lime three-use rule.
 */
export interface TimecodeProps {
  readonly children: React.ReactNode;
  /** Render a subtle bordered chip instead of bare text. */
  readonly chip?: boolean;
  readonly className?: string;
}

export function Timecode({ children, chip = false, className }: TimecodeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-[0.6875rem] uppercase leading-none tracking-[0.18em] text-muted",
        chip &&
          "rounded-pill border border-hairline bg-surface-2/60 px-2.5 py-1",
        className,
      )}
    >
      {children}
    </span>
  );
}
