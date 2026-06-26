import "server-only";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { env, requireServer } from "@/lib/env";

let _client: ElevenLabsClient | null = null;
function client() {
  if (!_client) _client = new ElevenLabsClient({ apiKey: requireServer("ELEVENLABS_API_KEY") });
  return _client;
}

/** Character-level timing from ElevenLabs `convertWithTimestamps`. */
export type VoiceAlignment = {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
};

export type VoiceoverResult = {
  mp3: Buffer;
  alignment: VoiceAlignment | null;
};

/**
 * Convert text to MP3 with character-level alignment for caption sync.
 * Per text-to-speech skill: eleven_turbo_v2_5 is the balanced quality/latency pick.
 * `voiceId` falls back to the env default when the caller doesn't pick one.
 */
export async function synthesizeVoiceover(
  text: string,
  voiceId?: string,
): Promise<VoiceoverResult> {
  const data = await client().textToSpeech.convertWithTimestamps(
    voiceId || env.ELEVENLABS_VOICE_ID,
    {
      text,
      modelId: "eleven_turbo_v2_5",
      outputFormat: "mp3_44100_128",
    },
  );

  const mp3 = Buffer.from(data.audioBase64, "base64");
  const alignment = data.alignment ?? data.normalizedAlignment ?? null;
  return { mp3, alignment };
}

/** Slim voice shape for the Step 5 picker. */
export type VoiceOption = {
  id: string;
  name: string;
  description: string | null;
  previewUrl: string | null;
  labels: Record<string, string>;
};

/** All voices available to this ElevenLabs account, for the user to choose from. */
export async function listVoices(): Promise<VoiceOption[]> {
  const { voices } = await client().voices.getAll();
  return voices.map((v) => ({
    id: v.voiceId,
    name: v.name ?? "Unnamed voice",
    description: v.description ?? null,
    previewUrl: v.previewUrl ?? null,
    labels: v.labels ?? {},
  }));
}
