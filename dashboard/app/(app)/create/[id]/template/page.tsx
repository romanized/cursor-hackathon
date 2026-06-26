import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { TemplatePicker } from "./template-picker";

export default async function TemplateStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: templates }] = await Promise.all([
    supabase.from("projects").select("template_id, media_type").eq("id", id).single(),
    supabase
      .from("templates")
      .select("id, name, kind, status, description, featured")
      .order("sort_order"),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="rise flex flex-col gap-3">
        <span className="overline">Step 01 · Template</span>
        <h1 className="text-4xl font-medium tracking-tight">
          Pick a <Accent>hook format.</Accent>
        </h1>
        <p className="text-muted max-w-xl">
          The format decides the visual language of the final video. You can change it any time before the script is locked.
        </p>
      </header>

      <TemplatePicker
        projectId={id}
        initialTemplate={project?.template_id ?? null}
        initialMediaType={project?.media_type ?? "video"}
        templates={templates ?? []}
      />
    </div>
  );
}
