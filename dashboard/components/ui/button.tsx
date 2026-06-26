import { forwardRef, type ButtonHTMLAttributes } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const button = tv({
  base: "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-[transform,background-color,box-shadow,color] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
  variants: {
    intent: {
      primary: "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-soft)] shadow-[var(--shadow-glow)]",
      secondary: "bg-[var(--color-surface-elev)] text-text border border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
      ghost: "bg-transparent text-muted hover:text-text",
      link: "text-text underline underline-offset-4 decoration-[var(--color-border-strong)] hover:decoration-[var(--color-accent)] rounded-none px-0",
    },
    size: {
      sm: "h-9 px-4 text-sm",
      md: "h-11 px-5 text-sm",
      lg: "h-14 px-6 text-base",
    },
  },
  defaultVariants: { intent: "primary", size: "md" },
});

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, intent, size, ...rest }, ref) {
    return <button ref={ref} className={button({ intent, size, className })} {...rest} />;
  },
);
