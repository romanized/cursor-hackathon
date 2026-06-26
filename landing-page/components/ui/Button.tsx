import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The design-system button.
 *
 * ACCENT LOCK: the `primary` variant is the lime CTA fill — one of the EXACTLY
 * THREE sanctioned lime uses sitewide (REC dot / active scrub line / primary CTA
 * fill). It is `bg-accent` + `text-on-accent` and nothing else carries lime. The
 * `ghost` variant is hairline-only (no accent) for secondary actions. This
 * primitive is purely token-styled and GSAP-free; pointer-driven "magnetic"
 * motion is owned by the calling section (via `contextSafe`) on a wrapper.
 */
export type ButtonVariant = "primary" | "ghost";
export type ButtonSize = "md" | "lg";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Forwarded so a section can attach the magnetic transform target. */
  readonly ref?: Ref<HTMLButtonElement>;
  readonly children: ReactNode;
}

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-pill font-sans font-medium leading-none whitespace-nowrap transition-colors duration-200 ease-[var(--ease-expo)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  // The ONE locked lime fill. Hover only shifts brightness, never hue.
  primary: "bg-accent text-on-accent hover:brightness-[1.08]",
  ghost:
    "border border-hairline-strong bg-surface-2/40 text-fg hover:bg-surface-2 hover:border-fg/25",
};

const SIZES: Record<ButtonSize, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-8 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  children,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
