import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { env, requireServer } from "@/lib/env";
import { fitTo916 } from "@/lib/media/fit-916";
import { loadTemplateReferenceImage } from "@/lib/references/template-mascots";

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

const ai = () => new GoogleGenAI({ apiKey: requireServer("GOOGLE_API_KEY") });

export type BeatImageInput = {
  templateId: string | null;
  productName: string | null;
  beat: { label: string | null; text: string; visual_prompt: string | null };
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
  const ref = await loadTemplateReferenceImage(input.templateId);
  const style = (input.templateId && MASCOT_STYLE[input.templateId]) || MASCOT_STYLE.skeleton_ai;

  const prompt = ref
    ? [
        style,
        "The supplied image is the character reference. Generate a NEW portrait of this EXACT same character — same cream fur, same French-bulldog puppy proportions, same big eyes, dark nose, upright ears, chubby belly, same whimsical 3D Pixar-style look — recomposed for a vertical reel. You may adjust pose and simplify the background but the character must be instantly recognisable as the same puppy from the reference.",
        REEL_FRAMING,
        "Single character portrait only. No product, no props, no text overlays, no logos, no watermarks. One image. PG-rated, brand-safe.",
      ].join("\n\n")
    : [
        style,
        REEL_FRAMING,
        "Single character portrait only. No product, no props, no text overlays, no logos, no watermarks. One image. PG-rated, brand-safe.",
      ].join("\n\n");

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (ref) {
    parts.push({
      inlineData: { mimeType: ref.mimeType, data: ref.bytes.toString("base64") },
    });
  }
  parts.push({ text: prompt });

  try {
    return await runImageGenerate({ parts });
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
  const style = (input.templateId && STYLE[input.templateId]) || STYLE.skeleton_ai;
  const beatPrompt =
    input.beat.visual_prompt?.trim() ||
    `Visualize this voiceover beat: "${input.beat.text}"`;

  try {
    return await runGenerate(input, style, beatPrompt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // PROHIBITED_CONTENT = a phrase in the prompt tripped the image safety
    // filter. Retry once with a fully generic product-photo prompt; this
    // strips the template style and the beat copy, which is where the
    // trigger almost always lives.
    if (!/PROHIBITED_CONTENT|SAFETY|BLOCKED/.test(msg)) throw e;
    console.warn("[google.generateBeatImage] retrying with safe fallback", { reason: msg });
    return await runGenerate(input, SAFE_STYLE, "Clean studio product shot. Centered, neutral background.");
  }
}

async function runGenerate(
  input: BeatImageInput,
  style: string,
  beatPrompt: string,
): Promise<{ bytes: Buffer; mimeType: string }> {
  const refLines: string[] = [];
  if (input.referenceImage) {
    refLines.push(
      "The first supplied image is the product — keep it identifiable and consistent in the scene.",
    );
  }
  if (input.mascotImage) {
    refLines.push(
      input.referenceImage
        ? "The second supplied image is the mascot character — keep this exact character design (face, colors, proportions, outfit) identical in every scene."
        : "The supplied image is the mascot character — keep this exact character design (face, colors, proportions, outfit) identical in every scene.",
    );
  }

  const prompt = [
    style,
    input.productName ? `Featured product: ${input.productName}.` : "",
    ...refLines,
    `Scene: ${beatPrompt}`,
    REEL_FRAMING,
    "No text overlays, no logos, no watermarks. One single image. PG-rated, brand-safe, no real people, no copyrighted characters.",
  ].filter(Boolean).join("\n\n");

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (input.referenceImage) {
    parts.push({
      inlineData: {
        mimeType: input.referenceImage.mimeType,
        data: input.referenceImage.bytes.toString("base64"),
      },
    });
  }
  if (input.mascotImage) {
    parts.push({
      inlineData: {
        mimeType: input.mascotImage.mimeType,
        data: input.mascotImage.bytes.toString("base64"),
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

export type ScriptBeat = { label: string; text: string; visual_prompt: string };
export type GeneratedScript = { voiceover_script: string; beats: ScriptBeat[] };

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
  const beatCount = input.runtime === "hook" ? 6 : 10;
  const style = (input.templateId && STYLE[input.templateId]) || STYLE.skeleton_ai;

  const prompt = [
    `You are a senior TikTok/Reels copywriter writing a viral product hook ad in English.`,
    `Output a structured ${input.runtime === "hook" ? "~18 second" : "~30 second"} script split into exactly ${beatCount} beats.`,
    ``,
    `BRIEF`,
    `- Product: ${input.productName || "(unspecified)"}`,
    input.productDescription ? `- Description: ${input.productDescription.slice(0, 500)}` : "",
    `- Target audience: ${input.targetAudience || "(general)"}`,
    input.customerIssues.length ? `- Customer pains:\n  ${input.customerIssues.map((p) => `· ${p}`).join("\n  ")}` : "",
    input.benefits.length ? `- Product benefits:\n  ${input.benefits.map((b) => `· ${b}`).join("\n  ")}` : "",
    ``,
    `STRUCTURE`,
    `- Beat 1 = Hook: a counter-intuitive, attention-grabbing punch in the first 2 seconds. No greetings, no "Hey guys".`,
    `- Then Problem → Reveal → Proof → (optional Detail) → CTA in order.`,
    `- Each beat: one spoken sentence, ≤ 14 words, conversational ("you", contractions, micro-pauses with "...").`,
    `- "visual_prompt" describes what should be on screen for the beat in the chosen visual style (${style}). One sentence, no camera jargon, no text overlays.`,
    `- The final "voiceover_script" must be the concatenation of all beat texts in order, separated by newlines — no extra prose.`,
  ].filter(Boolean).join("\n");

  const res = await ai().models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          voiceover_script: { type: Type.STRING },
          beats: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                text: { type: Type.STRING },
                visual_prompt: { type: Type.STRING },
              },
              required: ["label", "text", "visual_prompt"],
            },
          },
        },
        required: ["voiceover_script", "beats"],
      },
    },
  });

  const raw = res.text;
  if (!raw) throw new Error("Gemini returned empty script response");
  try {
    return JSON.parse(raw) as GeneratedScript;
  } catch (e) {
    console.error("[google.generateScript] JSON parse failed", { raw });
    throw e;
  }
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
