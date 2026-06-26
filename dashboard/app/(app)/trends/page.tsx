import { Accent } from "@/components/accent";
import { Card } from "@/components/ui/card";

export default function TrendsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="rise mb-8 flex flex-col gap-2">
        <span className="overline">Trends</span>
        <h1 className="text-4xl font-medium tracking-tight">
          What&apos;s working <Accent>right now.</Accent>
        </h1>
      </header>
      <Card className="p-8 text-muted">
        Soon: trending hooks, scripts, and templates from across Hookline. Build the first batch in the Create flow — community feed lights up once we ship.
      </Card>
    </div>
  );
}
