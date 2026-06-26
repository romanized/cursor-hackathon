import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StepStrip } from "@/components/step-strip";

export default async function CreateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, current_step")
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  return (
    <div className="relative">
      <div className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 px-6 py-4 backdrop-blur">
        <StepStrip projectId={project.id} furthest={project.current_step} />
      </div>
      <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
    </div>
  );
}
