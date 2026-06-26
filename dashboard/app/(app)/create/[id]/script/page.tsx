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
      .select("idx, label, text, visual_prompt, meta")
      .eq("project_id", id)
      .order("idx"),
  ]);

  const beatsForEditor = (beats ?? []).map((b) => {
    const meta = (b.meta ?? {}) as { type?: string; role?: string; duration_seconds?: number };
    return {
      idx: b.idx,
      label: b.label,
      text: b.text,
      visual_prompt: b.visual_prompt,
      type: meta.type === "microscopic" ? ("microscopic" as const) : ("character" as const),
      role: meta.role ?? "",
      duration_seconds: typeof meta.duration_seconds === "number" ? meta.duration_seconds : 4,
    };
  });

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

      {/* Re-mount the editor whenever the AI script generator (or any external
          write) lands new data. Sacrifices in-progress manual edits when AI
          re-drafts — explicit intent. */}
      <ScriptEditor
        key={`${beats?.length ?? 0}:${(project?.voiceover_script ?? "").length}`}
        projectId={id}
        project={project!}
        initialBeats={beatsForEditor}
      />
    </div>
  );
}
