# Hookline

> Paste a product link → out comes a ready-to-post, captioned 9:16 hook ad for
> TikTok & Reels. No studio, no editor, no shoot.

A "reverse engineered" take on [hookm.ai](https://hookm.ai) ("the #1 ad tool for
TikTok Shop"), built in a hackathon sprint. The whole thing is an **8-step pipeline**:
scrape a product, write the script, render per-beat frames, voice it, animate
each frame into motion, then mux it all into one captioned MP4 — every step a
Next.js server action backed by Supabase, fal.ai, Gemini, ElevenLabs, Apify and
ffmpeg.

## The pipeline

| # | Step | What happens | Engine |
|---|------|--------------|--------|
| 1 | **Template** | Pick a viral format (Skeleton AI, Cartoon, 3D CGI, …) and Video vs Slideshow. | — |
| 2 | **Product / Brief** | Paste a URL → Apify scrapes it. Edit the brief copy, audience, pain points, runtime, captions. | Apify |
| 3 | **Script** | Generate a voiceover script + per-beat visual breakdown from the brief. | Gemini 2.5 Flash |
| 4 | **Images** | Render one 9:16 frame per beat, seeded with the scraped product + a per-template mascot for character consistency. | Nano Banana 2 (fal) |
| 5 | **Voice** | Render the voiceover per beat, with character-level timestamps for caption sync. | ElevenLabs |
| 6 | **Clips** | Animate each beat frame into a real motion clip. "Skip" falls back to still-as-clip. | Veo 3.1 Lite (fal) |
| 7 | **Assemble** | ffmpeg concats every clip, stretches each to its narration length, mux the voiceover, burns in karaoke captions. | ffmpeg |
| 8 | **Film** | Play the finished, captioned 9:16 MP4. | — |

Each step is a server component that loads only the rows it needs and renders a
client editor; **Continue** calls a server action, persists a draft, and
advances `projects.current_step`. You can revisit earlier steps but not skip
ahead. Slow steps (4–7) write rows immediately and stream status over Supabase
Realtime, so the UI never hangs while generation runs.

## Repo layout

```
dashboard/        Next.js 16 app — the product. Auth, the 8-step wizard, all generation.
landing-page/     Next.js 16 marketing site — GSAP + Lenis scroll-driven "render room".
supabase/         SQL migrations: schema, RLS, storage, seed templates, credit fn.
context/          Living docs (project spec, frozen data contract, team plan).
scripts/          setup-db.sh — one-shot Supabase link + migrate for teammates.
.cursor/          data-contract skill + ponytail rule shared by all agents.
```

## Getting started

You need **Node 20+**, a **Supabase** project, and at minimum a **`FAL_KEY`**
(images + video) and **`GOOGLE_API_KEY`** (script step) to run the pipeline
end-to-end. Apify and ElevenLabs keys unlock scraping and voiceover.

```bash
git clone https://github.com/romanized/cursor-hackathon.git
cd cursor-hackathon

# 1. Database — link this clone to Supabase and apply migrations (idempotent)
cp .env.example .env          # fill in SUPABASE_* + SUPABASE_ACCESS_TOKEN
./scripts/setup-db.sh

# 2. Dashboard (the product)
cp .env.example dashboard/.env.local   # then trim to the dashboard block + keys
cd dashboard && npm install && npm run dev
```

Open <http://localhost:3000> — you'll be bounced to `/login` (email OTP or
Google). New accounts are granted **1000 credits** to spend on the pipeline.

To run the marketing site instead:

```bash
cd landing-page && npm install && npm run dev   # also on :3000
```

> Deeper guides: [`dashboard/README.md`](dashboard/README.md) (architecture),
> [`dashboard/FAL-SETUP.md`](dashboard/FAL-SETUP.md) (default generation engine),
> [`dashboard/TESTING.md`](dashboard/TESTING.md) (end-to-end demo script).

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Server Actions, React 19) |
| Auth | Supabase Auth — `@supabase/ssr` email OTP + Google OAuth |
| DB | Supabase Postgres, **RLS on every table** |
| Storage | Supabase Storage (`media` bucket, per-user folders, signed URLs) |
| Realtime | Supabase Realtime — live asset status during async generation |
| Scrape | Apify (`website-content-crawler`) |
| Script | Gemini 2.5 Flash (structured JSON: voiceover + beats) |
| Images | **fal.ai** Nano Banana 2 (default) · Gemini Nano-banana (free fallback) |
| Video | **fal.ai** Veo 3.1 Lite (default) · Replicate Kling / LTX · Google Veo |
| Voice | ElevenLabs (`eleven_turbo_v2_5`, with alignment timestamps) |
| Assemble | ffmpeg / ffprobe (bundled binaries) — concat, mux, ASS karaoke captions |
| UI | Tailwind v4, Hugeicons, `tailwind-variants` (dashboard) · GSAP + Lenis (landing) |

### Generation engine

[fal.ai](https://fal.ai) is the **default** for both images and video — one key,
pay-per-use, no rate-limit cliff. A typical 5–7 beat video costs **~$1.40–2.00**
(voiceover excluded). Everything is swappable by env var, no code change:

| Step | Default | `IMAGE_PROVIDER` / `VIDEO_PROVIDER` alternatives |
|------|---------|--------------------------------------------------|
| 4 Images | Nano Banana 2 (`fal`) | `google` — free Gemini fallback |
| 6 Video | Veo 3.1 Lite (`fal`) | `replicate-kling` (best face consistency), `replicate-ltx` (cheapest), `google-veo` |

Clips are rendered **muted** by design — the ElevenLabs voiceover is the only
audio in the final cut. See [`dashboard/FAL-SETUP.md`](dashboard/FAL-SETUP.md).

## Data model & credits

The whole app builds against one frozen contract — `projects` is the central
object walking all 8 steps, with `products`, `beats`, and `assets` hanging off
it. `assets` doubles as the async job table (`status` + `attempts` + `error`),
so generation is tracked per-output without a separate queue.

Billing is **pay-as-you-go**: every vendor call charges the user *after* it
returns usable data, via the atomic `charge_credits` Postgres function (balance
update + append-only ledger insert in one transaction, `service_role` only).
Costs are anchored to **1 credit ≈ $0.01** and live in one place,
[`dashboard/lib/credits.ts`](dashboard/lib/credits.ts).

Full schema, RLS conventions, lifecycles, and the per-step read/write map:
[`context/DATA-MODEL.md`](context/DATA-MODEL.md).

## Docs

- [`context/PROJECT.md`](context/PROJECT.md) — product spec & the 8-step workflow.
- [`context/DATA-MODEL.md`](context/DATA-MODEL.md) — the frozen schema contract, ER diagram, RLS rules, credit economy.
- [`context/TEAM-PLAN.md`](context/TEAM-PLAN.md) — the 3 parallel workstreams + demo lock.
- [`context/REVERSE-ENGINEER.md`](context/REVERSE-ENGINEER.md) — how the source platform works.
- [`context/SUPABASE.md`](context/SUPABASE.md) — Supabase setup (CLI, MCP, migrations).
</content>
</invoke>
