import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Faux-OS window chrome — a minimalist "render suite" app window.
 *
 * A titlebar (three hairline traffic-light dots + an optional mono title and
 * trailing slot) over a bordered surface body. Purely presentational and
 * token-styled: no GSAP, no business logic, no accent colour — so the locked
 * lime accent rule is never violated here. A design-system primitive sections
 * can compose for faux-OS "render suite" panels.
 */
export interface WindowChromeProps {
  /** Mono title shown in the titlebar (e.g. a file path or app name). */
  readonly title?: string;
  /** Optional trailing titlebar slot (mono badge, status, etc.). */
  readonly trailing?: ReactNode;
  /** Window body. */
  readonly children: ReactNode;
  readonly className?: string;
  /** Extra classes for the body wrapper (padding overrides, etc.). */
  readonly bodyClassName?: string;
}

export function WindowChrome({
  title,
  trailing,
  children,
  className,
  bodyClassName,
}: WindowChromeProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-frame border border-hairline bg-surface",
        className,
      )}
    >
      {/* Titlebar */}
      <div className="flex items-center gap-3 border-b border-hairline bg-surface-2/60 px-4 py-3">
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-pill border border-hairline-strong bg-surface" />
          <span className="h-2.5 w-2.5 rounded-pill border border-hairline-strong bg-surface" />
          <span className="h-2.5 w-2.5 rounded-pill border border-hairline-strong bg-surface" />
        </span>
        {title ? (
          <span className="truncate font-mono text-[0.6875rem] uppercase leading-none tracking-[0.18em] text-muted">
            {title}
          </span>
        ) : null}
        {trailing ? <span className="ml-auto">{trailing}</span> : null}
      </div>
      {/* Body */}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}
