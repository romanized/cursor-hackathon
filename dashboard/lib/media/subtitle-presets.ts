/** VEED subtitle presets exposed by fal.ai `veed/subtitles`. */

export const VEED_DYNAMIC_PRESETS = [
  "glass",
  "whisper",
  "glide2",
  "fusion",
  "glide",
  "terminal",
  "handwritten",
  "backdrop",
  "backdrop2",
] as const;

export const VEED_BASIC_PRESETS = [
  "simple",
  "plain",
  "beans",
  "corpo",
  "boo",
  "shadeplay",
  "casper",
  "capri",
  "lowkey",
  "vinta",
  "diego",
  "ali",
  "slay",
  "kitty",
  "hustle",
  "karl",
  "sprout",
  "flex",
  "mint",
  "rizz",
  "vegas",
] as const;

export const VEED_SUBTITLE_PRESETS = [
  ...VEED_DYNAMIC_PRESETS,
  ...VEED_BASIC_PRESETS,
] as const;

export type VeedSubtitlePreset = (typeof VEED_SUBTITLE_PRESETS)[number];

export const DEFAULT_SUBTITLE_PRESET: VeedSubtitlePreset = "simple";

const PRESET_SET = new Set<string>(VEED_SUBTITLE_PRESETS);

function titleCase(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export const VEED_SUBTITLE_PRESET_GROUPS = [
  {
    tier: "dynamic" as const,
    label: "Dynamic (~2× cost)",
    presets: VEED_DYNAMIC_PRESETS.map((id) => ({ id, label: titleCase(id) })),
  },
  {
    tier: "basic" as const,
    label: "Basic",
    presets: VEED_BASIC_PRESETS.map((id) => ({ id, label: titleCase(id) })),
  },
];

export function parseSubtitlePreset(value: unknown): VeedSubtitlePreset {
  if (typeof value === "string" && PRESET_SET.has(value)) {
    return value as VeedSubtitlePreset;
  }
  return DEFAULT_SUBTITLE_PRESET;
}
