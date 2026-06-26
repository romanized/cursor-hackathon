import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { ImagesEditor } from "./images-editor";

export default async function ImagesStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: beats }, { data: assets }, { data: user }] = await Promise.all([
    supabase.from("beats").select("id, idx, label, text, visual_prompt").eq("project_id", id).order("idx"),
    supabase
      .from("assets")
      .select("beat_id, url, storage_path, status, error")
      .eq("project_id", id)
      .eq("kind", "image"),
    supabase.auth.getUser(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="rise flex flex-col gap-3">
        <span className="overline">Step 04 · Images</span>
        <h1 className="text-4xl font-medium tracking-tight">
          One image per <Accent>beat.</Accent>
        </h1>
        <p className="text-muted max-w-xl">
          Upload (or drop in) the visual that should appear for each beat. PNG/JPG, up to 8&nbsp;MB.
        </p>
      </header>

      <ImagesEditor
        projectId={id}
        userId={user.user!.id}
        beats={beats ?? []}
        assets={assets ?? []}
      />
    </div>
  );
}
