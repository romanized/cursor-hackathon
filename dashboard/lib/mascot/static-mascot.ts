import "server-only";

import { createService } from "@/lib/supabase/service";
import { fitTo916 } from "@/lib/media/fit-916";
import {
  hasTemplateReference,
  loadTemplateReferenceImage,
} from "@/lib/references/template-mascots";
import type { TablesUpdate } from "@/lib/db";

type ProjectMeta = { mascot_storage_path?: string | null };

/** Copy the bundled template reference into Storage — no Gemini, no credits. */
export async function seedStaticMascotIfNeeded(args: {
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;
  userId: string;
  projectId: string;
  templateId: string | null;
  meta: ProjectMeta | null | undefined;
}): Promise<{ path: string | null; url: string | null }> {
  if (!hasTemplateReference(args.templateId)) {
    return { path: null, url: null };
  }

  const meta = args.meta ?? {};
  const svc = createService();

  if (meta.mascot_storage_path) {
    const { data: signed } = await svc.storage
      .from("media")
      .createSignedUrl(meta.mascot_storage_path, 60 * 60 * 24);
    return { path: meta.mascot_storage_path, url: signed?.signedUrl ?? null };
  }

  const ref = await loadTemplateReferenceImage(args.templateId);
  if (!ref) return { path: null, url: null };

  const fitted = await fitTo916(ref.bytes, ref.mimeType);
  const path = `${args.userId}/${args.projectId}/mascot.png`;
  const { error: upErr } = await svc.storage.from("media").upload(path, fitted.bytes, {
    contentType: fitted.mimeType,
    upsert: true,
  });
  if (upErr) throw upErr;

  const patch: TablesUpdate<"projects"> = {
    meta: { ...meta, mascot_storage_path: path } as never,
  };
  const { error: metaErr } = await args.supabase
    .from("projects")
    .update(patch)
    .eq("id", args.projectId);
  if (metaErr) throw metaErr;

  const { data: signed } = await svc.storage.from("media").createSignedUrl(path, 60 * 60 * 24);
  return { path, url: signed?.signedUrl ?? null };
}
