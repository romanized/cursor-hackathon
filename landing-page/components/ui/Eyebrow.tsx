import { cn } from "@/lib/utils/cn";

/**
 * The section eyebrow — a mono kicker above a section heading.
 *
 * Pairs a small index marker (e.g. a section count) with an uppercase mono
 * label, echoing a render-queue line item. Token-styled, no accent, no GSAP.
 */
export interface EyebrowProps {
  readonly children: React.ReactNode;
  /** Optional leading marker, e.g. a zero-padded section index like "04". */
  readonly index?: string;
  readonly className?: string;
}

export function Eyebrow({ children, index, className }: EyebrowProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 font-mono text-xs uppercase leading-none tracking-[0.22em] text-muted",
        className,
      )}
    >
      {index ? (
        <>
          <span className="text-fg/70">{index}</span>
          <span aria-hidden className="h-px w-8 bg-hairline-strong" />
        </>
      ) : null}
      {children}
    </span>
  );
}
