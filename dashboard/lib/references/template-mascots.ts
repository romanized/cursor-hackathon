import "server-only";

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Source photos bundled per template — fed to Gemini as the character reference. */
const TEMPLATE_REFS: Record<string, { file: string; mimeType: string }> = {
  pibble_dog: {
    file: path.join(process.cwd(), "public/references/pibble-mascot.png"),
    mimeType: "image/png",
  },
  skeleton_ai: {
    file: path.join(process.cwd(), "public/references/skeleton-mascot.png"),
    mimeType: "image/png",
  },
};

// Only count a template as having a bundled reference if the file is actually
// present — otherwise fall back to Gemini mascot generation. Lets us register a
// template before its asset ships without breaking image generation.
export function hasTemplateReference(templateId: string | null): boolean {
  if (!templateId) return false;
  const ref = TEMPLATE_REFS[templateId];
  return Boolean(ref && existsSync(ref.file));
}

export async function loadTemplateReferenceImage(
  templateId: string | null,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  if (!templateId || !TEMPLATE_REFS[templateId]) return null;
  const { file, mimeType } = TEMPLATE_REFS[templateId];
  return { bytes: await readFile(file), mimeType };
}
