import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { seedStaticMascotIfNeeded } from "@/lib/mascot/static-mascot";
import { hasTemplateReference } from "@/lib/references/template-mascots";
import { ImagesEditor } from "./images-editor";

export default async function ImagesStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  const [{ data: project }, { data: beats }, { data: assets }] = await Promise.all([
    supabase.from("projects").select("template_id, meta").eq("id", id).single(),
    supabase.from("beats").select("id, idx, label, text, visual_prompt").eq("project_id", id).order("idx"),
    supabase
      .from("assets")
      .select("id, beat_id, kind, url, storage_path, status, error")
      .eq("project_id", id)
      .eq("kind", "image"),
  ]);

  const fixedMascot = hasTemplateReference(project?.template_id ?? null);
  let mascotUrl: string | null = null;

  if (fixedMascot && user.user) {
    const seeded = await seedStaticMascotIfNeeded({
      supabase,
      userId: user.user.id,
      projectId: id,
      templateId: project?.template_id ?? null,
      meta: (project?.meta ?? {}) as { mascot_storage_path?: string | null },
    });
    mascotUrl = seeded.url;
  } else {
    const mascotPath = (project?.meta as { mascot_storage_path?: string | null } | null)
      ?.mascot_storage_path;
    if (mascotPath) {
      const { data: signed } = await supabase.storage.from("media").createSignedUrl(mascotPath, 60 * 60 * 24);
      mascotUrl = signed?.signedUrl ?? null;
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="rise flex flex-col gap-3">
        <span className="overline">Step 04 · Images</span>
        <h1 className="text-4xl font-medium tracking-tight">
          One image per <Accent>beat.</Accent>
        </h1>
        <p className="text-muted max-w-xl">
          {fixedMascot
            ? "This template uses a fixed mascot — generate one scene per beat and the same character carries through every shot."
            : "Generate a mascot first, then one scene per beat. Upload to override any beat."}
        </p>
      </header>

      <ImagesEditor
        key={mascotUrl ?? "no-mascot"}
        projectId={id}
        userId={user.user!.id}
        beats={beats ?? []}
        assets={assets ?? []}
        mascotUrl={mascotUrl}
        fixedMascot={fixedMascot}
      />
    </div>
  );
}
