# cursor-hackathon — hookm

A "reverse engineered" hookm.ai. Paste a product URL → out comes a TikTok-ready
hook video, built with Supabase + Apify + ElevenLabs and a Next.js dashboard.

## Getting Started

```bash
git clone https://github.com/romanized/cursor-hackathon.git
cd cursor-hackathon
cp .env.example .env             # root + Supabase CLI/MCP vars
cp .env.example dashboard/.env.local  # then trim to the dashboard block
cd dashboard && npm install && npm run dev
```

Open <http://localhost:3000>. Detailed dev guide: [`dashboard/README.md`](dashboard/README.md);
test plan: [`dashboard/TESTING.md`](dashboard/TESTING.md).

## Layout

- `dashboard/` — Next.js app (App Router, Server Actions, Tailwind v4, Hugeicons).
- `supabase/migrations/` — SQL migrations (schema, RLS, seeds, credit fn).
- `context/` — living docs:
  - `PROJECT.md` — product spec & decisions
  - `DATA-MODEL.md` — schema contract, ER diagram, RLS rules
  - `TEAM-PLAN.md` — workstreams + handoff status
  - `REVERSE-ENGINEER.md` — the source platform we're cloning
  - `CLAUDE.md`, `SUPABASE.md` — agent + infra guidelines
- `.cursor/skills/data-contract/` — schema/RLS rubric used by all agents.

## Stack

| Layer    | Choice                                       |
|----------|-----------------------------------------------|
| Auth     | Supabase Auth (`@supabase/ssr` email OTP + Google) |
| DB       | Supabase Postgres, RLS-on-everything          |
| Storage  | Supabase Storage (`media` bucket, per-user folders) |
| Scrape   | Apify (`apify/website-content-crawler` actor) |
| Voice    | ElevenLabs (`eleven_turbo_v2_5`)              |
| Frontend | Next.js App Router, Tailwind v4, Hugeicons    |
