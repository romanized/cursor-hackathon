import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { ClipsPanel } from "./clips-panel";

export default async function ClipsStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: images }, { data: clips }] = await Promise.all([
    supabase
      .from("assets")
      .select("id, beat_id, url")
      .eq("project_id", id)
      .eq("kind", "image")
      .eq("status", "ready"),
    supabase
      .from("assets")
      .select("id, beat_id, url")
      .eq("project_id", id)
      .eq("kind", "clip")
      .eq("status", "ready"),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="rise flex flex-col gap-3">
        <span className="overline">Step 06 · Clips</span>
        <h1 className="text-4xl font-medium tracking-tight">
          Animate the <Accent>beats.</Accent>
        </h1>
        <p className="text-muted max-w-xl">
          Hackathon build: each image is held as a still clip. Swap this step for Remotion or a video model when you&apos;re ready.
        </p>
      </header>

      <ClipsPanel
        projectId={id}
        imageCount={images?.length ?? 0}
        clips={(clips ?? []).map((c) => ({ id: c.id, url: c.url }))}
      />
    </div>
  );
}
