import { clsx } from "cnfast";

// Inline italic serif emphasis word. Use inside headings: "Welcome, <Accent>creator.</Accent>"
export function Accent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={clsx("accent", className)}>{children}</span>;
}
