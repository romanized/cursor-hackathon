# fal.ai is now the default generation engine

**What changed:** Steps 4 (images) and 6 (video) now run on **fal.ai** by default,
replacing the Google/Replicate providers. One key powers both. Everything is wired and
typechecks clean — you only need to add the key and top up.

## To run it (the only manual steps)

1. Get a key: https://fal.ai/dashboard/keys
2. **Top up credits** (fal Billing) — it's pay-per-use, no subscription.
3. Put it in the root `.env`:
   ```
   FAL_KEY=your_key_here
   ```
4. Run as normal. That's it — `IMAGE_PROVIDER` and `VIDEO_PROVIDER` already default to `fal`.

> **Keep `GOOGLE_API_KEY` too** — Step 3 (script + beats, Gemini text) still uses it.

## What you get (defaults)

| Step | Model | Spec | ~Cost |
|---|---|---|---|
| 4 Images | Nano Banana 2 | 9:16, standard res | ~$0.08 / image |
| 6 Video | Veo 3.1 Lite | 4s, **muted**, 720p | ~$0.20 / clip |

→ ~**$1.40–2.00** per 5–7 beat video (voice excluded — that's ElevenLabs, unchanged).
Clips are muted by design; the ElevenLabs voiceover is the only audio in the final cut.

## What was touched (all in `dashboard/`, plus root `.env.example`)

- **`lib/providers/fal.ts`** (new) — `generateBeatImageFal` + `generateVideoFromImageFal`.
  Matches the existing provider signatures exactly (`{ bytes, mimeType }`), so it's a true drop-in.
- **`lib/providers/video.ts`** — added the `fal` case to the switch.
- **`lib/actions/images.ts`** — branches to fal when `IMAGE_PROVIDER=fal`. For fal, byte
  references (product/mascot) are uploaded to signed URLs (fal needs URLs, not base64).
- **`lib/env.ts`** — `FAL_KEY`, `IMAGE_PROVIDER`, `FAL_VIDEO_MODEL`, `FAL_DURATION_SECONDS`,
  `FAL_RESOLUTION`; `VIDEO_PROVIDER` enum gained `fal` and both default to `fal`.
- **`lib/credits.ts`** — added `clipFal` (20 credits ≈ $0.20) + the `fal` case.
- **clips UI** (`page.tsx`, `clips-panel.tsx`) — provider label/copy for fal.
- **`@fal-ai/client`** added to `package.json`.

## Switching back / tuning (env only, no code)

- Images on free Gemini again: `IMAGE_PROVIDER=google`
- Different video model: `VIDEO_PROVIDER=replicate-kling` (or `replicate-ltx`, `google-veo`)
- Higher quality video: `FAL_RESOLUTION=1080p` or `FAL_DURATION_SECONDS=8`
- Swap the fal video model entirely: `FAL_VIDEO_MODEL=fal-ai/<other>/image-to-video`

## Notes / gotchas

- All fal calls are **server-only** (`FAL_KEY` never reaches the browser) — same as the others.
- Prices are verified estimates (fal.ai, 2026-06-26) for the credit display, **not billing**. Re-check before relying on them.
- The credit cost per clip is `COST.clipFal` in `lib/credits.ts` — tune one line to re-price.
- Quick isolated test: temporarily call `generateVideoFromImageFal` / `generateBeatImageFal`
  from a throwaway route with `FAL_KEY` set; both return `{ bytes, mimeType }`.
