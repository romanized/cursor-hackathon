import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { STEPS } from "@/components/step-strip";

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: drafts } = await supabase
    .from("projects")
    .select("id, title, product_name, status, current_step, updated_at")
    .order("updated_at", { ascending: false })
    .limit(30);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="rise mb-8 flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <span className="overline">Library</span>
          <h1 className="text-4xl font-medium tracking-tight">
            Your <Accent>drafts</Accent> and films
          </h1>
        </div>
        <Link href="/create">
          <Button intent="primary">New project</Button>
        </Link>
      </header>

      {!drafts?.length ? (
        <Card className="p-8 text-center text-muted">
          Nothing here yet. <Link className="text-text underline" href="/create">Start your first project →</Link>
        </Card>
      ) : (
        <div className="grid gap-3">
          {drafts.map((d) => {
            const step = STEPS[Math.min(STEPS.length - 1, Math.max(0, d.current_step - 1))];
            return (
              <Link key={d.id} href={`/create/${d.id}/${step.slug}`}>
                <Card className="flex items-center justify-between p-5 transition-colors hover:border-[var(--color-border-strong)]">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{d.title || d.product_name || "Untitled draft"}</span>
                    <span className="text-xs text-faint">
                      {d.status} · step {String(d.current_step).padStart(2, "0")} ({step.label}) · {new Date(d.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-muted">Resume →</span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
