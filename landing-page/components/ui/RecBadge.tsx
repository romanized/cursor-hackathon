import { cn } from "@/lib/utils/cn";

/**
 * The live-record HUD badge: a lime dot + a mono status label.
 *
 * ACCENT LOCK: the dot is one of the EXACTLY THREE sanctioned lime uses sitewide
 * (REC dot / active scrub line / primary CTA fill). The lime lives ONLY on the
 * dot — the label text stays `text-fg`/`text-muted`, never lime. Do not add lime
 * anywhere else in this component.
 *
 * The dot's pulse is a pure CSS animation that respects `prefers-reduced-motion`
 * (globals.css neutralizes CSS animation under reduce), so it needs no GSAP.
 */
export interface RecBadgeProps {
  /** Status label, e.g. `"LIVE — render engine online"`. */
  readonly label: string;
  readonly className?: string;
}

export function RecBadge({ label, className }: RecBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted",
        className,
      )}
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        {/* Soft pulsing halo — lime, but decorative ring of the same locked dot. */}
        <span className="absolute inline-flex h-full w-full animate-ping rounded-pill bg-accent/70 motion-reduce:hidden" />
        {/* The solid REC dot — one of the three locked lime uses. */}
        <span className="relative inline-flex h-2 w-2 rounded-pill bg-accent" />
      </span>
      <span className="text-fg">{label}</span>
    </span>
  );
}
