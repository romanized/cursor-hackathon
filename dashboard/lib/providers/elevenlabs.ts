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
 */
export async function synthesizeVoiceover(text: string): Promise<VoiceoverResult> {
  const data = await client().textToSpeech.convertWithTimestamps(env.ELEVENLABS_VOICE_ID, {
    text,
    modelId: "eleven_turbo_v2_5",
    outputFormat: "mp3_44100_128",
  });

  const mp3 = Buffer.from(data.audioBase64, "base64");
  const alignment = data.alignment ?? data.normalizedAlignment ?? null;
  return { mp3, alignment };
}
