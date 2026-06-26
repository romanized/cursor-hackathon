import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { ScriptEditor } from "./script-editor";

export default async function ScriptStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: beats }] = await Promise.all([
    supabase
      .from("projects")
      .select("voiceover_script, runtime, product_name, customer_issues, benefits, target_audience")
      .eq("id", id)
      .single(),
    supabase
      .from("beats")
      .select("idx, label, text, visual_prompt")
      .eq("project_id", id)
      .order("idx"),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="rise flex flex-col gap-3">
        <span className="overline">Step 03 · Script</span>
        <h1 className="text-4xl font-medium tracking-tight">
          Write the <Accent>hook.</Accent>
        </h1>
        <p className="text-muted max-w-xl">
          Beats become the per-frame visuals later. Keep them short and punchy — one image per beat, in order. Saving this step charges your credits.
        </p>
      </header>

      <ScriptEditor
        projectId={id}
        project={project!}
        initialBeats={beats ?? []}
      />
    </div>
  );
}
