# hookm — dashboard

The Next.js app for hookm, a "reverse engineered" hookm.ai built on Supabase
(BaaS + AaaS), Apify (scraping), and ElevenLabs (voiceover). UI uses Tailwind
v4 + Hugeicons; type-safe DB access through generated `lib/db.ts`.

## Setup

```bash
cd dashboard
npm install
cp ../.env.example .env.local   # then fill in the dashboard block
npm run dev
```

Open <http://localhost:3000>; you'll be redirected to `/login`. The auth flow
supports email OTP and Google (Google needs the Supabase provider enabled).

## Architecture

- `app/login` — public auth screen (email OTP + Google OAuth via `@supabase/ssr`).
- `app/auth/callback` — OAuth code exchange.
- `app/(app)` — protected workspace; `middleware.ts` refreshes the session and
  bounces unauthenticated requests to `/login?next=…`.
- `app/(app)/create/[id]/[step]` — the 8-step wizard. Each step page is a
  server component that loads the project + the rows it needs, and renders a
  client editor that calls a server action on Continue.
- `components/step-strip.tsx` — horizontal step indicator. The "furthest" step
  comes from `projects.current_step`; users can revisit but not skip ahead.
- `lib/supabase/{client,server,middleware,service}.ts` — three Supabase clients.
  Anything that needs to bypass RLS (file uploads, atomic credit charges, the
  `charge_credits` RPC) uses `service.ts`; everything else uses the user's
  session-aware client and inherits RLS.
- `lib/actions/*` — server actions, one per resource (projects, products,
  images, voice, clips, assemble). All read `auth.getUser()` first and bail to
  `/login` if missing.
- `lib/providers/{apify,elevenlabs,google}.ts` — thin SDK wrappers. Swap the
  actor / voice / image model in one place. The Google wrapper drives:
  - **Step 3** — `generateScript()`: `gemini-2.5-flash` with `responseSchema`
    to return `{ voiceover_script, beats[] }` from the saved brief.
  - **Step 4** — `generateBeatImage()`: `gemini-2.5-flash-image` (Nano-banana),
    optionally seeded with the scraped product image as a reference.
  - **Step 6** — `generateVideoFromImage()`: Veo 3 Fast image-to-video, 9:16,
    4-second clips per beat. Long-running operation polled until done.
  Per-template style hints live in `STYLE` inside `google.ts`.
- `lib/credits.ts` — wraps the atomic `charge_credits` Postgres function from
  `supabase/migrations/20260626110000_credits_fn.sql`. Step 3 is the only
  charging point right now (1 credit for hook, 3 for full).

## Step flow

| # | Slug       | What happens                                                                  |
|---|------------|-------------------------------------------------------------------------------|
| 1 | template   | Pick a format (skeleton, cartoon, …). Persists `template_id` + `media_type`. |
| 2 | product    | Paste URL → Apify scrape. Edit brief copy by hand and pick runtime/captions. |
| 3 | script     | "Draft script" calls Gemini 2.5 Flash to produce voiceover + beats from the brief. Edit by hand. Saving **charges credits** atomically. |
| 4 | images     | "Generate with AI" calls Gemini 2.5 Flash Image (Nano-banana) per beat, using the scraped product as a visual reference. Manual upload still works to override any beat. |
| 5 | voice      | ElevenLabs renders voiceover MP3 to Storage, signed URL goes on the asset.   |
| 6 | clips      | "Generate motion clips with Veo" turns each beat image into a real 4-second 9:16 MP4 via Veo 3 Fast. "Skip — use still images" falls back to image-as-clip rows if Veo is over budget or fails. |
| 7 | assemble   | ponytail: bundles clips + voice into a single `kind='final'` asset.          |
| 8 | film       | Player advances the clip strip over the voiceover audio; auto-detects video vs still clips and renders `<video>` / `<img>` accordingly. |

Step 7 stays minimal — when we move to a real renderer (Remotion or
ffmpeg) only that server action changes. Step 6 is wired to live Veo.

## Drafts

Drafts are persisted on every Continue. `projects.current_step` records the
highest step the user has reached; the step strip uses it to gate forward
navigation but lets the user freely revisit earlier steps. The Library page
lists all drafts and deep-links to the right step on resume.

## Conventions

- All Supabase types live in `lib/db.ts`. Regenerate with the Supabase MCP
  (`generate_typescript_types`) after every migration.
- Server actions go in `lib/actions/*.ts`. Pages are server components; only
  interactive editors are client components.
- `clsx` + `tailwind-variants` for class composition; design tokens in
  `app/globals.css` under `@theme inline`.
- Icons: `@hugeicons/react` + `@hugeicons/core-free-icons`.
- See `TESTING.md` for the end-to-end demo script.
