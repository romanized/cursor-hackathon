import "server-only";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { env, requireServer } from "@/lib/env";

let _client: ElevenLabsClient | null = null;
function client() {
  if (!_client) _client = new ElevenLabsClient({ apiKey: requireServer("ELEVENLABS_API_KEY") });
  return _client;
}

/**
 * Convert text to MP3 audio. Returns a Buffer ready to upload to Supabase Storage.
 * Per text-to-speech skill: eleven_turbo_v2_5 is the balanced quality/latency pick.
 */
export async function synthesizeVoiceover(text: string): Promise<Buffer> {
  const stream = await client().textToSpeech.convert(env.ELEVENLABS_VOICE_ID, {
    text,
    modelId: "eleven_turbo_v2_5",
    outputFormat: "mp3_44100_128",
  });

  const chunks: Buffer[] = [];
  // ElevenLabs returns a Web ReadableStream<Uint8Array>; Node 18+ supports
  // async iteration on it but TS lib types don't reflect that — cast through unknown.
  for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
