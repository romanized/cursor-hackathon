import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { Card } from "@/components/ui/card";

export default async function BillingPage() {
  const supabase = await createClient();
  const [{ data: profile }, { data: ledger }] = await Promise.all([
    supabase.from("profiles").select("credits").single(),
    supabase
      .from("credit_ledger")
      .select("delta, reason, balance_after, created_at, project_id")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="rise mb-8 flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <span className="overline">Usage</span>
          <h1 className="text-4xl font-medium tracking-tight">
            <Accent>{profile?.credits ?? 0}</Accent> credits left
          </h1>
        </div>
      </header>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="overline-muted px-5 py-3">When</th>
              <th className="overline-muted px-5 py-3">Reason</th>
              <th className="overline-muted px-5 py-3 text-right">Delta</th>
              <th className="overline-muted px-5 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {!ledger?.length && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-muted">No usage yet.</td></tr>
            )}
            {ledger?.map((row, i) => (
              <tr key={i} className="border-t border-[var(--color-border)]">
                <td className="px-5 py-3 text-faint">{new Date(row.created_at).toLocaleString()}</td>
                <td className="px-5 py-3 text-text">{row.reason}</td>
                <td className={`px-5 py-3 text-right font-medium ${row.delta < 0 ? "text-[var(--color-accent-soft)]" : "text-text"}`}>
                  {row.delta > 0 ? "+" : ""}{row.delta}
                </td>
                <td className="px-5 py-3 text-right text-muted">{row.balance_after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
