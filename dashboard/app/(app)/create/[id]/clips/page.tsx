import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { env } from "@/lib/env";
import { ClipsPanel } from "./clips-panel";

const VIDEO_PROVIDER_LABEL: Record<typeof env.VIDEO_PROVIDER, string> = {
  fal: "Veo 3.1 Lite (fal)",
  "replicate-kling": "Kling 2.6",
  "replicate-ltx": "LTX-Video",
  "google-veo": "Veo 3 Fast",
};

// Veo image-to-video is long-running (~60s per beat). Allow up to 10 minutes
// for the full set of beats so the server action doesn't time out on Vercel.
// ponytail: when we move clip rendering to a background queue this can drop.
export const maxDuration = 600;

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
      .select("id, beat_id, kind, url, storage_path, status, error")
      .eq("project_id", id)
      .eq("kind", "clip")
      .order("created_at"),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="rise flex flex-col gap-3">
        <span className="overline">Step 06 · Clips</span>
        <h1 className="text-4xl font-medium tracking-tight">
          Animate the <Accent>beats.</Accent>
        </h1>
        <p className="text-muted max-w-xl">
          Each beat&apos;s image becomes a real motion clip via {VIDEO_PROVIDER_LABEL[env.VIDEO_PROVIDER]}. Falls back to still images if the model is over budget or fails.
        </p>
      </header>

      <ClipsPanel
        projectId={id}
        imageCount={images?.length ?? 0}
        clips={clips ?? []}
        provider={env.VIDEO_PROVIDER}
      />
    </div>
  );
}
