import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The horizontal layout shell.
 *
 * Centers content and applies the consistent gutter rhythm every section shares,
 * so individual sections never re-declare max-width / padding. Token-styled only;
 * no GSAP, no business logic — a pure design-system primitive.
 */
export interface ContainerProps {
  /** Rendered element/landmark. Defaults to a plain `div`. */
  readonly as?: ElementType;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Container({
  as: Tag = "div",
  className,
  children,
}: ContainerProps) {
  return (
    <Tag className={cn("mx-auto w-full max-w-7xl px-6 md:px-10", className)}>
      {children}
    </Tag>
  );
}
