// Shared step metadata — imported by both server components (library, layout)
// and client components (step-strip). MUST NOT have "use client"; that would
// flip imports into opaque client references on the server side.

export const STEPS = [
  { idx: 1, slug: "template", label: "Template", caption: "Pick a format" },
  { idx: 2, slug: "product",  label: "Product",  caption: "Your brief" },
  { idx: 3, slug: "script",   label: "Script",   caption: "Hook & beats" },
  { idx: 4, slug: "images",   label: "Images",   caption: "Frame render" },
  { idx: 5, slug: "voice",    label: "Voice",    caption: "Voiceover render" },
  { idx: 6, slug: "clips",    label: "Clips",    caption: "Motion clips" },
  { idx: 7, slug: "assemble", label: "Assemble", caption: "Final cut" },
  { idx: 8, slug: "film",     label: "Film",     caption: "Your footage" },
] as const;

export type StepSlug = (typeof STEPS)[number]["slug"];

export function stepFromSlug(slug: StepSlug) {
  return STEPS.find((s) => s.slug === slug)!;
}

export function stepFromNumber(stepNum: number | null | undefined) {
  const n = typeof stepNum === "number" && Number.isFinite(stepNum) ? stepNum : 1;
  return STEPS[Math.min(STEPS.length - 1, Math.max(0, n - 1))];
}
