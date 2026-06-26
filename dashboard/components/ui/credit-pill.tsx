import { clsx } from "cnfast";

export function CreditPill({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full bg-[rgba(239,68,68,0.12)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-accent)]",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-[var(--color-accent)]" />
      {amount} credit{amount === 1 ? "" : "s"}
    </span>
  );
}
