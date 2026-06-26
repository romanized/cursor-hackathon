import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

/** Source photos bundled per template — fed to Gemini as the character reference. */
const TEMPLATE_REFS: Record<string, { file: string; mimeType: string }> = {
  pibble_dog: {
    file: path.join(process.cwd(), "public/references/pibble-mascot.png"),
    mimeType: "image/png",
  },
};

export function hasTemplateReference(templateId: string | null): boolean {
  return Boolean(templateId && TEMPLATE_REFS[templateId]);
}

export async function loadTemplateReferenceImage(
  templateId: string | null,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  if (!templateId || !TEMPLATE_REFS[templateId]) return null;
  const { file, mimeType } = TEMPLATE_REFS[templateId];
  return { bytes: await readFile(file), mimeType };
}
