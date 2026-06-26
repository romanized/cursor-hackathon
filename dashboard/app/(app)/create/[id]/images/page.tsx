import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { ImagesEditor } from "./images-editor";

export default async function ImagesStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: beats }, { data: assets }, { data: user }] = await Promise.all([
    supabase.from("projects").select("meta").eq("id", id).single(),
    supabase.from("beats").select("id, idx, label, text, visual_prompt").eq("project_id", id).order("idx"),
    supabase
      .from("assets")
      .select("id, beat_id, kind, url, storage_path, status, error")
      .eq("project_id", id)
      .eq("kind", "image"),
    supabase.auth.getUser(),
  ]);

  const mascotPath = (project?.meta as { mascot_storage_path?: string | null } | null)?.mascot_storage_path;
  let mascotUrl: string | null = null;
  if (mascotPath) {
    const { data: signed } = await supabase.storage.from("media").createSignedUrl(mascotPath, 60 * 60 * 24);
    mascotUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="rise flex flex-col gap-3">
        <span className="overline">Step 04 · Images</span>
        <h1 className="text-4xl font-medium tracking-tight">
          One image per <Accent>beat.</Accent>
        </h1>
        <p className="text-muted max-w-xl">
          Generate a mascot first, then one scene per beat — the same character and product carry through every shot. Upload to override any beat.
        </p>
      </header>

      <ImagesEditor
        key={mascotUrl ?? "no-mascot"}
        projectId={id}
        userId={user.user!.id}
        beats={beats ?? []}
        assets={assets ?? []}
        mascotUrl={mascotUrl}
      />
    </div>
  );
}
