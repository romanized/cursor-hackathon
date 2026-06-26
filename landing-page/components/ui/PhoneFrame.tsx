import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * PhoneFrame — a reusable 9:16 device bezel for vertical (TikTok/Reels) content.
 *
 * Machined-hardware look: a hairline-bordered surface bezel wrapping a true
 * 9:16 screen with a notch pill and a soft inner edge. Purely presentational —
 * no GSAP, no accent (audit-safe against the lime three-use lock), no business
 * logic. Sections drop their own layers (still photo, finished ad, HUD, scrub
 * line) into `children`, which fill the clipped screen via absolute positioning.
 *
 * The screen is `overflow-hidden` so a scrub line / cross-dissolving layers stay
 * masked to the device. No `backdrop-blur` here — this frame is meant to live on
 * a scrolling/pinned surface where blur would be GPU-fatal.
 */
export interface PhoneFrameProps {
  /** Screen content — layered absolutely-positioned panels (still, ad, HUD…). */
  readonly children: ReactNode;
  /** Show the top notch pill. Defaults to `true`. */
  readonly notch?: boolean;
  /** Class applied to the OUTER bezel (sizing/positioning is the caller's job). */
  readonly className?: string;
  /** Class applied to the inner screen (e.g. a base background). */
  readonly screenClassName?: string;
  /** Optional label for assistive tech describing the framed content. */
  readonly "aria-label"?: string;
}

export function PhoneFrame({
  children,
  notch = true,
  className,
  screenClassName,
  "aria-label": ariaLabel,
}: PhoneFrameProps) {
  return (
    <div
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
      className={cn(
        // The bezel: a hardware-feeling surface slab with a hairline edge.
        "relative rounded-[2.25rem] border border-hairline-strong bg-surface-2",
        "p-2.5 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[2.25rem]",
        "before:border before:border-white/[0.04] before:[mask:linear-gradient(#000,transparent)]",
        className,
      )}
    >
      <div
        className={cn(
          // The screen: true 9:16, clipped so layered content never escapes.
          "relative aspect-[9/16] w-full overflow-hidden rounded-[1.65rem] bg-bg",
          screenClassName,
        )}
      >
        {notch ? (
          <span
            aria-hidden
            className="absolute left-1/2 top-2.5 z-30 h-1.5 w-16 -translate-x-1/2 rounded-pill bg-black/70"
          />
        ) : null}
        {children}
      </div>
    </div>
  );
}
