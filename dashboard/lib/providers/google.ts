import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { env, requireServer } from "@/lib/env";
import { fitTo916 } from "@/lib/media/fit-916";

const REEL_ASPECT = "9:16" as const;
const REEL_FRAMING =
  "MUST be vertical portrait 9:16 aspect ratio (tall narrow frame, 720×1280). NOT square, NOT landscape.";

// gemini-2.5-flash-image (a.k.a. "Nano-banana") — generous free tier in AI Studio.
// Per-template style hints. Keys match templates.id from the seed migration.
//
// Safety note: the image model trips PROHIBITED_CONTENT on (a) gore-coded
// imagery (real skeletons, blood, dark horror palettes) and (b) named
// copyrighted styles ("Simpsons-style", "Pixar-style", etc.). The prompts
// below stay clear of both — describe the look, never the brand.
const STYLE: Record<string, string> = {
  skeleton_ai:
    "Cinematic 3D CGI render of a stylised friendly cartoon mascot character with a smooth white bone-like body and big expressive cartoon eyes, holding and showing off the product. Premium product-ad lighting, soft shadows, clean dark teal studio backdrop, subtle cyan rim light. Hyperdetailed, octane-style render, vertical 9:16 framing. PG-rated, playful, not scary.",
  cartoon:
    "Vibrant 2D cartoon illustration in a flat, bold yellow-skinned suburban-comedy animation style (generic, no real character). Thick black outlines, flat saturated colors, exaggerated comic proportions, dynamic comic-panel composition. Vertical 9:16 framing.",
  cgi_3d:
    "Photoreal 3D CGI character holding and showcasing the product, soft global illumination, shallow depth of field, cinema-quality render. Vertical 9:16 framing.",
  ai_streamer_clip:
    "Stylised gaming streamer webcam capture of a generic young creator on stream, headset on, mid-reaction. Behind them: a neon RGB lit bedroom-studio with LED strips, plants, monitor glow. Faux on-screen overlay (subscribe banner, donation alert) shown around the edges. Subtle chromatic aberration, gentle motion blur, high-end webcam quality. Vertical 9:16 framing. PG-rated, no real-person likeness.",
  pibble_dog:
    "Feature the exact cream-coloured French-bulldog-style puppy mascot from the reference — same soft off-white fur, same big dark eyes, dark nose, rounded upright ears, chubby belly with belly button, playful upright pose energy. Place this puppy in the scene interacting with or showing the product per the beat. Whimsical Pixar-quality 3D render, soft cinematic lighting, magical pastel sky with subtle sparkles optional. MUST remain recognisably the same character. Vertical 9:16 framing.",
};

// Last-resort fallback when the styled prompt is blocked. Generic product
// photography — virtually never triggers PROHIBITED_CONTENT.
const SAFE_STYLE =
  "Premium product photography of the supplied item on a clean light backdrop. Soft studio lighting, shallow depth of field, vertical 9:16 framing. No people, no logos, no text overlays.";

// Canonical mascot portrait — same keys as STYLE / templates.id. Character
// only, no product, neutral pose so it works as a reference across beats.
const MASCOT_STYLE: Record<string, string> = {
  skeleton_ai:
    "Cinematic 3D CGI render of a stylised friendly cartoon mascot with a smooth white bone-like body and big expressive cartoon eyes. Full character visible, neutral friendly pose facing camera, arms relaxed. Clean dark teal studio backdrop, subtle cyan rim light. Vertical 9:16 portrait. PG-rated, playful, not scary.",
  cartoon:
    "Vibrant 2D cartoon mascot in a flat, bold suburban-comedy animation style (generic, no real character). Thick black outlines, exaggerated proportions, friendly expression, full character facing camera. Vertical 9:16 portrait.",
  cgi_3d:
    "Photoreal 3D CGI mascot character, full body visible, neutral friendly pose facing camera. Soft global illumination, shallow depth of field, cinema-quality render. Vertical 9:16 portrait.",
  ai_streamer_clip:
    "Stylised young gaming streamer mascot, headset on, friendly mid-smile, facing webcam. Neon RGB bedroom-studio backdrop, LED strips, monitor glow. Vertical 9:16 portrait. PG-rated, no real-person likeness.",
  pibble_dog:
    "Whimsical high-quality 3D Pixar-style cream French-bulldog puppy mascot: soft off-white velvety fur, large glossy dark eyes, dark grey nose, rounded upright ears, wide happy smile, chubby belly with belly button. Playful upright pose on a shimmering rainbow with pastel sunset clouds and soft sparkles. Full character centered. Vertical 9:16 portrait.",
};

// Render/look ONLY — no character nouns. Used when a mascot reference image is
// supplied so the text doesn't describe a *different* generic character that
// competes with the reference (the cause of every beat inventing a new look).
export const RENDER_STYLE: Record<string, string> = {
  skeleton_ai:
    "Cinematic 3D CGI render, premium product-ad lighting, soft shadows, clean dark teal studio backdrop, subtle cyan rim light, hyperdetailed octane-style finish.",
  cartoon:
    "Vibrant 2D cartoon illustration, flat bold saturated colors, thick black outlines, dynamic comic-panel composition.",
  cgi_3d:
    "Photoreal 3D CGI render, soft global illumination, shallow depth of field, cinema-quality lighting.",
  ai_streamer_clip:
    "Stylised gaming-stream webcam look, neon RGB bedroom-studio, LED strips, monitor glow, subtle chromatic aberration, high-end webcam quality.",
  pibble_dog:
    "Whimsical Pixar-quality 3D render, soft cinematic lighting, magical pastel palette with optional soft sparkles.",
};

const ai = () => new GoogleGenAI({ apiKey: requireServer("GOOGLE_API_KEY") });

// gemini-2.5-flash-image only accepts these raster input types. Scraped product
// photos are often SVG logos (image/svg+xml) which the API rejects with a 400
// "Unsupported MIME type" — drop any reference image that isn't supported.
const GEMINI_IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function asSupportedRef(
  ref: { bytes: Buffer; mimeType: string } | null | undefined,
): { bytes: Buffer; mimeType: string } | null {
  if (!ref) return null;
  let mt = ref.mimeType.toLowerCase().split(";")[0].trim();
  if (mt === "image/jpg") mt = "image/jpeg";
  if (!GEMINI_IMAGE_MIME.has(mt)) {
    console.warn("[google] dropping unsupported reference image", { mimeType: ref.mimeType });
    return null;
  }
  return { bytes: ref.bytes, mimeType: mt };
}

export type BeatType = "character" | "microscopic";

export type BeatImageInput = {
  templateId: string | null;
  productName: string | null;
  beat: { label: string | null; text: string; visual_prompt: string | null };
  /** "microscopic" = pure mechanism CGI: no character, no product/style refs. */
  beatType?: BeatType | null;
  /** Scraped product photo — keeps the product identifiable across beats. */
  referenceImage?: { bytes: Buffer; mimeType: string } | null;
  /** Canonical mascot portrait — keeps the character design identical across beats. */
  mascotImage?: { bytes: Buffer; mimeType: string } | null;
};

/**
 * Generate a single still image for one beat. Returns PNG buffer + mime type.
 * If a reference image (the scraped product) is provided it is sent as input
 * so the product itself stays visually consistent across beats.
 */
/** One canonical mascot portrait for the project — no product, no beat scene. */
export async function generateMascotImage(input: {
  templateId: string | null;
}): Promise<{ bytes: Buffer; mimeType: string }> {
  const style = (input.templateId && MASCOT_STYLE[input.templateId]) || MASCOT_STYLE.skeleton_ai;
  const prompt = [
    style,
    REEL_FRAMING,
    "Single character portrait only. No product, no props, no text overlays, no logos, no watermarks. One image. PG-rated, brand-safe.",
  ].join("\n\n");

  try {
    return await runImageGenerate({ parts: [{ text: prompt }] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/PROHIBITED_CONTENT|SAFETY|BLOCKED/.test(msg)) throw e;
    console.warn("[google.generateMascotImage] retrying with safe fallback", { reason: msg });
    return await runImageGenerate({
      parts: [{ text: `${SAFE_STYLE}\n\nFriendly generic cartoon mascot character, full body, neutral pose.` }],
    });
  }
}

export async function generateBeatImage(input: BeatImageInput): Promise<{ bytes: Buffer; mimeType: string }> {
  const beatPrompt =
    input.beat.visual_prompt?.trim() ||
    `Visualize this voiceover beat: "${input.beat.text}"`;

  const hasMascot = Boolean(asSupportedRef(input.mascotImage));

  // Microscopic = macro mechanism reveal. Drop the product ref (the scene is a
  // close-up) but KEEP the mascot as a small cameo so every image features the
  // character. Render in the SAME template style as the character beats so the
  // macro shots don't read as a separate (uncanny) sci-fi/medical look.
  if (input.beatType === "microscopic") {
    const micStyle =
      (input.templateId && RENDER_STYLE[input.templateId]) || RENDER_STYLE.cgi_3d;
    const micInput: BeatImageInput = { ...input, referenceImage: null };
    try {
      return await runGenerate(micInput, micStyle, beatPrompt, "cameo");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/PROHIBITED_CONTENT|SAFETY|BLOCKED/.test(msg)) throw e;
      console.warn("[google.generateBeatImage] microscopic retry with safe fallback", { reason: msg });
      return await runGenerate({ ...micInput, mascotImage: null }, SAFE_STYLE, "Clean studio product shot. Centered, neutral background.", "lock");
    }
  }

  // With a mascot reference we use a character-FREE render style so the prompt
  // never describes a competing generic character. Without one (rare — mascot
  // download failed), fall back to the full STYLE that does describe a character.
  const style = hasMascot
    ? (input.templateId && RENDER_STYLE[input.templateId]) || RENDER_STYLE.cgi_3d
    : (input.templateId && STYLE[input.templateId]) || STYLE.skeleton_ai;

  try {
    return await runGenerate(input, style, beatPrompt, "lock");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // PROHIBITED_CONTENT = a phrase in the prompt tripped the image safety
    // filter. Retry once with a fully generic product-photo prompt; this
    // strips the template style and the beat copy, which is where the
    // trigger almost always lives.
    if (!/PROHIBITED_CONTENT|SAFETY|BLOCKED/.test(msg)) throw e;
    console.warn("[google.generateBeatImage] retrying with safe fallback", { reason: msg });
    return await runGenerate(input, SAFE_STYLE, "Clean studio product shot. Centered, neutral background.", "lock");
  }
}

async function runGenerate(
  input: BeatImageInput,
  style: string,
  beatPrompt: string,
  charMode: "lock" | "cameo" = "lock",
): Promise<{ bytes: Buffer; mimeType: string }> {
  const productRef = asSupportedRef(input.referenceImage);
  const mascotRef = asSupportedRef(input.mascotImage);

  // The mascot instruction leads the prompt — reference image dominates so the
  // SAME character appears in every beat instead of a new one each time.
  const lead: string[] = [];
  if (mascotRef) {
    const which = productRef ? "second" : "first";
    lead.push(
      charMode === "cameo"
        ? `The ${which} supplied image is the brand MASCOT. Include this EXACT character somewhere in the frame as a smaller cameo (observing or gesturing toward the visualization) — identical face, colors, outfit and proportions, do NOT redesign it. The macro mechanism stays the main subject.`
        : `CHARACTER LOCK — the ${which} supplied image is the brand MASCOT and is the main subject. Reproduce this EXACT character: identical face, head, body shape, colors, outfit and proportions. Do NOT redesign, restyle, age, recolor or swap the character — it must be unmistakably the same character as the reference image in every beat.`,
    );
  }
  if (productRef) {
    lead.push(
      "The first supplied image is the product — keep it identifiable and consistent in the scene.",
    );
  }

  const prompt = [
    ...lead,
    `Scene: ${beatPrompt}`,
    input.productName ? `Featured product: ${input.productName}.` : "",
    style ? `Style and lighting: ${style}` : "",
    REEL_FRAMING,
    "No text overlays, no logos, no watermarks. One single image. PG-rated, brand-safe, no real people, no copyrighted characters.",
  ].filter(Boolean).join("\n\n");

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (productRef) {
    parts.push({
      inlineData: {
        mimeType: productRef.mimeType,
        data: productRef.bytes.toString("base64"),
      },
    });
  }
  if (mascotRef) {
    parts.push({
      inlineData: {
        mimeType: mascotRef.mimeType,
        data: mascotRef.bytes.toString("base64"),
      },
    });
  }
  parts.push({ text: prompt });

  return runImageGenerate({ parts });
}

async function runImageGenerate(args: {
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
}): Promise<{ bytes: Buffer; mimeType: string }> {
  const res = await ai().models.generateContent({
    model: "gemini-2.5-flash-image",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contents: args.parts as any,
    config: {
      // ponytail: API hint when supported; fitTo916() below is the hard guarantee.
      imageConfig: { aspectRatio: REEL_ASPECT },
    },
  });

  const candidate = res.candidates?.[0];
  const textParts: string[] = [];
  for (const part of candidate?.content?.parts ?? []) {
    const inline = (part as { inlineData?: { data?: string; mimeType?: string } }).inlineData;
    if (inline?.data) {
      const raw = {
        bytes: Buffer.from(inline.data, "base64"),
        mimeType: inline.mimeType || "image/png",
      };
      return fitTo916(raw.bytes, raw.mimeType);
    }
    const t = (part as { text?: string }).text;
    if (t) textParts.push(t);
  }

  const diag = {
    promptFeedback: res.promptFeedback ?? null,
    finishReason: candidate?.finishReason ?? null,
    finishMessage: candidate?.finishMessage ?? null,
    safetyRatings: candidate?.safetyRatings ?? null,
    citationMetadata: candidate?.citationMetadata ?? null,
    text: textParts.join("\n").slice(0, 500) || null,
    partKinds: candidate?.content?.parts?.map((p) => Object.keys(p)) ?? [],
  };
  console.error("[google.generateBeatImage] no image part", diag);

  const reasonBits = [
    diag.finishReason && `finish=${diag.finishReason}`,
    diag.promptFeedback?.blockReason && `block=${diag.promptFeedback.blockReason}`,
    diag.text && `text="${diag.text.slice(0, 120)}"`,
  ].filter(Boolean);
  throw new Error(
    reasonBits.length
      ? `Gemini returned no image part (${reasonBits.join(", ")})`
      : "Gemini returned no image part",
  );
}

// =============================================================================
// Script generator — Gemini 2.5 Flash with structured JSON output.
// =============================================================================

export type ScriptBeat = {
  label: string;
  text: string;
  visual_prompt: string;
  type: BeatType;
  role: string;
  duration_seconds: number;
};
export type GeneratedScript = {
  voiceover_script: string;
  metaphor: string;
  beats: ScriptBeat[];
};

// The recurring hero per template — the character that acts the pain/payoff in
// every `character` beat. The mascot reference IMAGE (loaded at render) carries
// the exact look; this text only tells the scriptwriter who it is.
const CHARACTER: Record<string, { name: string; description: string }> = {
  skeleton_ai: {
    name: "Skeleton",
    description:
      "a full-body figure with translucent glass-like skin revealing a white skeleton inside, wearing a blue sports headband, with large round expressive cartoon eyes",
  },
  cartoon: {
    name: "Cartoon",
    description:
      "a bold yellow-skinned suburban-comedy cartoon character with thick black outlines and exaggerated comic proportions",
  },
  cgi_3d: {
    name: "Hero",
    description: "a photoreal 3D CGI character",
  },
  ai_streamer_clip: {
    name: "Streamer",
    description: "a young gaming streamer wearing a headset in a neon RGB bedroom-studio",
  },
  pibble_dog: {
    name: "Pibble",
    description:
      "a cream-coloured French-bulldog puppy with soft off-white fur, big dark eyes, a dark nose, rounded upright ears and a chubby belly",
  },
};

// =============================================================================
// Brief inference — derive audience / pains / benefits from scraped data.
// =============================================================================

export type InferredBrief = {
  target_audience: string;
  customer_issues: string[];
  benefits: string[];
};

export async function inferBrief(input: {
  productName: string | null;
  description: string | null;
}): Promise<InferredBrief> {
  if (!input.productName && !input.description) {
    return { target_audience: "", customer_issues: [], benefits: [] };
  }

  const prompt = [
    `You are a senior DTC marketing strategist. Given the product info below, return a short consumer brief.`,
    ``,
    `PRODUCT`,
    input.productName ? `- Name: ${input.productName}` : "",
    input.description ? `- Copy/description (may be marketing fluff): ${input.description.slice(0, 1200)}` : "",
    ``,
    `RULES`,
    `- target_audience: one sentence (≤ 18 words) naming the person. Be specific (age band, life situation, what they're already doing). No "anyone who…".`,
    `- customer_issues: 3-5 short pains the buyer is trying to solve. Each ≤ 10 words, problem-first ("My X keeps Y").`,
    `- benefits: 3-5 concrete payoffs of THIS product. Each ≤ 10 words, outcome-first ("Fits in your pocket"). No marketing adjectives ("amazing", "ultimate").`,
    `- If the description is too sparse to infer something, leave the field as an empty string / array. Do not invent facts about the product.`,
  ].filter(Boolean).join("\n");

  const res = await ai().models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          target_audience: { type: Type.STRING },
          customer_issues: { type: Type.ARRAY, items: { type: Type.STRING } },
          benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["target_audience", "customer_issues", "benefits"],
      },
    },
  });

  const raw = res.text;
  if (!raw) return { target_audience: "", customer_issues: [], benefits: [] };
  try {
    return JSON.parse(raw) as InferredBrief;
  } catch (e) {
    console.error("[google.inferBrief] JSON parse failed", { raw });
    throw e;
  }
}

export type ScriptInput = {
  templateId: string | null;
  productName: string | null;
  targetAudience: string | null;
  customerIssues: string[];
  benefits: string[];
  runtime: "hook" | "full"; // hook ~6 beats, full ~10
  productDescription?: string | null;
};

export async function generateScript(input: ScriptInput): Promise<GeneratedScript> {
  const isHook = input.runtime === "hook";
  const runtimeSeconds = isHook ? 28 : 70;
  const beatRange = isHook ? "6 to 8" : "10 to 14";
  const wordTarget = isHook ? "70-90 words" : "175-210 words";

  const character =
    (input.templateId && CHARACTER[input.templateId]) || CHARACTER.skeleton_ai;

  const prompt = [
    `You are a senior short-form ad scriptwriter. You write scroll-stopping UGC "hook" videos that mix TWO shot types — but ONE consistent look:`,
    `1. a recurring acted CHARACTER (the hero) who suffers the problem and is saved, and`,
    `2. "microscopic" macro reveal beats that show WHY the product works at extreme close-up scale, rendered in the SAME visual style, palette and lighting as the character beats so the whole video feels like one piece.`,
    ``,
    `THE CHARACTER (lock for the WHOLE video — same hero in every character beat):`,
    `- Name: ${character.name}`,
    `- Description: ${character.description}`,
    `- A reference IMAGE of this character is supplied to the image model on every character beat, so in "visual_prompt" you describe ONLY action, pose, scene, camera and light — say "the character", NEVER re-describe the anatomy/body.`,
    ``,
    `BRIEF`,
    `- Product: ${input.productName || "(unspecified)"}`,
    input.productDescription ? `- Description: ${input.productDescription.slice(0, 800)}` : "",
    `- Target audience: ${input.targetAudience || "(infer from the product)"}`,
    input.customerIssues.length ? `- Customer pains (raw — dramatize, never copy verbatim):\n  ${input.customerIssues.map((p) => `· ${p}`).join("\n  ")}` : "",
    input.benefits.length ? `- Benefits / mechanism (the one reason it works drives the microscopic beats):\n  ${input.benefits.map((b) => `· ${b}`).join("\n  ")}` : "",
    ``,
    `CORE PRINCIPLE — dramatize the pain, then prove the mechanism.`,
    `- Problem = felt, visible drama. The character physically lives the WORST-CASE version of the pain. Visceral, not "a bit uncomfortable".`,
    `- Solution = a credible mechanism made beautiful: reveal the inner mechanism as an extreme macro close-up (the microscopic beats), in the SAME rendered world as the rest of the ad. Proof, not a claim.`,
    `- MATCH THE REGISTER: if the pain is already physical/visceral (drowning, suffocating, burning, crushing) play it STRAIGHT, intense, realistic. If the pain is mundane (ugly glasses, hot room, slow wifi) ESCALATE to absurdist physical peril so it still reads as life-or-death. Tame = invisible = no views; absurd-when-it-should-be-real breaks the spell. Calibrate.`,
    ``,
    `THE TWO BEAT TYPES (every beat is exactly one):`,
    `- "character": the supplied character physically performs the pain (problem beats) or the relief (payoff), in a real-world setting that matches the product.`,
    `- "microscopic": an extreme macro close-up INSIDE or at the surface of the product, showing the ONE mechanism that makes it work. Same render style, palette and lighting as the character beats — NOT a separate sci-fi/medical look. Calm and fascinating, the macro is the hero.`,
    ``,
    `BEAT ARC (arrange in this order). Open and close on a "character" beat; place "microscopic" at the mechanism turn:`,
    `1. Hook + escalation (first 2-3 beats, "character", role hook then escalation): drop mid-pain, no build-up; each beat stacks a DIFFERENT, WORSE pain from the brief.`,
    `2. Reframe (1 beat, "character", role reframe): "it's not because you're bad at this" — show the character competent/capable, remove self-blame.`,
    `3. Mechanism (1-2 beats, "microscopic", role mechanism): the CGI proof of WHY it works, calm and luminous.`,
    isHook ? "" : `   (full ad only) add a product reveal beat (role solution) that names the product + its one mechanism.`,
    `4. Payoff (final beat, "character", role payoff): the character restored — hopeful, curious, or thriving.`,
    ``,
    `VOICE-OVER RULES`,
    `- Hook lands in the first 1-2 seconds: pattern-interrupt, blunt claim, or question. Direct-address UGC tone: casual, punchy, contractions. NO corporate voice.`,
    `- Pace ~2-2.5 words/sec → total voiceover_script ≈ ${wordTarget}. The drama lives in the VISUALS; the VO stays believably casual over the chaos.`,
    `- Each beat's vo_line is a COMPLETE spoken sentence of roughly 12-20 words that stands on its own when read aloud. Do NOT split a single sentence across beats or leave dangling fragments ("...just sounds like a"). Every line is a full thought.`,
    isHook
      ? `- HOOK VARIANT shape (do this): (a) pain stack "If you [pain 1], [pain 2], or [pain 3]—", (b) reframe "It's probably not because [self-blame the audience assumes]—", (c) principle "[the activity] just needs [the core mechanism, described generically] to actually work." NO brand name, NO call-to-action — the tease IS the hook.`
      : `- FULL AD: include a product reveal (name the product + its one mechanism) and a closing SOFT CTA ("link's right there").`,
    ``,
    `VISUAL-PROMPT RULES (always 9:16):`,
    `- character beats: "9:16 image of the character [action dramatizing this beat], [emotional detail], [body language]. [Real-world environment]. [Camera angle], [lighting]." Action/scene only — do NOT describe the character's anatomy.`,
    `- microscopic beats: describe ONLY the macro subject + action — "Extreme macro close-up of [the mechanism] [doing X] inside / at the surface of the product. [Tiny real-world element] for scale. Slow push-in, shallow depth of field, 9:16 vertical." Do NOT specify colours, palette, mood, or any render look — the global template style is applied automatically so these beats MATCH the character beats. NEVER use a 'medical', 'sci-fi', 'bioluminescent', 'dark moody' or 'neon glow' look.`,
    ``,
    `OUTPUT`,
    `- ${beatRange} beats. Each beat: type, role, vo_line, duration_seconds (4-6s each, summing to ≈ ${runtimeSeconds}), visual_prompt.`,
    `- "metaphor": one line naming the peril the character endures (real or absurdist per register).`,
    `- "voiceover_script": the full spoken text as one block — the beats' vo_line in order must reconstruct it.`,
    `- Never invent unverifiable factual/medical claims; only dramatize what the brief supports.`,
  ].filter(Boolean).join("\n");

  const res = await ai().models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          metaphor: { type: Type.STRING },
          voiceover_script: { type: Type.STRING },
          beats: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["character", "microscopic"] },
                role: { type: Type.STRING },
                vo_line: { type: Type.STRING },
                duration_seconds: { type: Type.NUMBER },
                visual_prompt: { type: Type.STRING },
              },
              required: ["type", "role", "vo_line", "duration_seconds", "visual_prompt"],
            },
          },
        },
        required: ["metaphor", "voiceover_script", "beats"],
      },
    },
  });

  const raw = res.text;
  if (!raw) throw new Error("Gemini returned empty script response");

  type RawBeat = {
    type?: string;
    role?: string;
    vo_line?: string;
    duration_seconds?: number;
    visual_prompt?: string;
  };
  type RawScript = { metaphor?: string; voiceover_script?: string; beats?: RawBeat[] };

  let parsed: RawScript;
  try {
    parsed = JSON.parse(raw) as RawScript;
  } catch (e) {
    console.error("[google.generateScript] JSON parse failed", { raw });
    throw e;
  }

  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const beats: ScriptBeat[] = (parsed.beats ?? []).map((b) => {
    const type: BeatType = b.type === "microscopic" ? "microscopic" : "character";
    const role = (b.role ?? "").trim();
    return {
      type,
      role,
      label: cap(role) || (type === "microscopic" ? "Mechanism" : "Beat"),
      text: (b.vo_line ?? "").trim(),
      visual_prompt: (b.visual_prompt ?? "").trim(),
      duration_seconds:
        typeof b.duration_seconds === "number" && b.duration_seconds > 0
          ? b.duration_seconds
          : 4,
    };
  });

  const voiceover_script =
    (parsed.voiceover_script ?? "").trim() ||
    beats.map((b) => b.text).filter(Boolean).join(" ");

  return { voiceover_script, metaphor: (parsed.metaphor ?? "").trim(), beats };
}

// =============================================================================
// Veo image-to-video. Long-running operation; poll until done, then download.
// =============================================================================

export async function generateVideoFromImage(input: {
  imageBytes: Buffer;
  imageMimeType: string;
  prompt: string;
  durationSeconds?: number;
}): Promise<{ bytes: Buffer; mimeType: string }> {
  const client = ai();
  console.log("[veo] kickoff", {
    model: env.VEO_MODEL,
    durationSeconds: input.durationSeconds ?? env.VEO_DURATION_SECONDS,
    promptChars: input.prompt.length,
  });

  let operation = await client.models.generateVideos({
    model: env.VEO_MODEL,
    prompt: input.prompt,
    image: {
      imageBytes: input.imageBytes.toString("base64"),
      mimeType: input.imageMimeType,
    },
    config: {
      aspectRatio: "9:16",
      durationSeconds: input.durationSeconds ?? env.VEO_DURATION_SECONDS,
      // `generateAudio` is Vertex-only — Developer API rejects it. We mute the
      // <video> element on playback so any baked-in audio doesn't fight the
      // ElevenLabs voiceover.
      personGeneration: "allow_adult",
      numberOfVideos: 1,
    },
  });

  // Poll. Veo takes ~30-120s depending on duration + model.
  const started = Date.now();
  while (!operation.done) {
    await new Promise((r) => setTimeout(r, 8000));
    operation = await client.operations.getVideosOperation({ operation });
    const elapsed = Math.round((Date.now() - started) / 1000);
    if (elapsed > 300) throw new Error(`Veo timed out after ${elapsed}s`);
  }

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video?.uri) {
    console.error("[veo] no video", { response: operation.response });
    throw new Error("Veo returned no video URI");
  }

  // The URI requires the API key appended as a query param to authenticate.
  const url = `${video.uri}${video.uri.includes("?") ? "&" : "?"}key=${requireServer("GOOGLE_API_KEY")}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Veo download failed: ${resp.status} ${resp.statusText}`);
  const bytes = Buffer.from(await resp.arrayBuffer());
  console.log("[veo] done", { bytes: bytes.length, mimeType: video.mimeType });
  return { bytes, mimeType: video.mimeType || "video/mp4" };
}
