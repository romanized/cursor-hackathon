# Team-plan — Marktaanval (mens)

Doel: in ~7 werkuren een schaalbare, werkende demo bouwen zonder dat de 3 werkstromen botsen.

## 3 werkstromen (parallel, eigen scope)
1. **Research & tooling** — virale video's analyseren, scrape-aanpak, generatie-tools, beeld→video.
2. **Backend & dashboard** — integratie, jobs, data, dashboard.
3. **Frontend** — landing page, login, app-UI.

## Anti-conflict: het contract (eerst, samen, vóór er gebouwd wordt)
Mappen scheiden is niet genoeg — werkstromen botsen op de *data*. Het contract staat in **[DATA-MODEL.md](DATA-MODEL.md)** (Supabase migrations + RLS). Wat erin zit:
- Het centrale object dat door alle 8 stappen loopt: `projects` (+ `products`, `beats`, `assets`).
- De koppeling frontend ⇆ backend: status-velden (`projects.status`, `current_step`, `assets.status`) zodat de UI nooit hangt.
- De credit-economie: `profiles.credits` + append-only `credit_ledger`. Kosten (hook=1, full=3) in de server actions.

Wijzigingen aan het contract? PR met migratie **en** doc-update in dezelfde commit.

## Prioriteiten
1. **User-flow / gebruiksvriendelijkheid** — alles logisch, je weet waar alles is. Performance-based, werkt ook met animaties uit.
2. **Kern werkt end-to-end** — 1 happy path (zie demo-lock). + kleine clip-editor (knippen, volgorde, snelheid).
3. **Extra** — library (voortgang), trends-pagina, account/subscription, credit-demo (nep-checkout/code → credits).

## Demo-definitie (lock)
Minimale demo die bewijst dat het werkt: **1 product → 1 template (Skeleton AI) → brief → script → images → voice → samengesteld → afspeelbare video.**
Alles daarbuiten (slideshow, andere formats, trends, subscription) = post-MVP.

## Eerst de-risken (research, dag-start)
- **beeld→video (stap 6):** hier hebben we geen voorbeeld van → eigen aanpak zoeken. Hoogste onzekerheid → eerst.
- **async generatie:** stappen 4–7 zijn traag en kunnen falen → job-model (status/retry), UI nooit laten hangen.

## Status (live)

- ✅ Migrations applied: core schema, RLS + Storage, template seeds, advisor fixes, `charge_credits`. Advisors = 0 lints.
- ✅ Dashboard scaffold in `dashboard/` (Next.js, Tailwind v4, Hugeicons). Auth + (app) shell + 8-step wizard wired end-to-end. See `dashboard/README.md`.
- ⏳ Stap 6 (image→video) is een **still-clip placeholder** met een `ponytail:` markering in `lib/actions/clips.ts`. Upgrade-pad: Remotion of een video-model — alleen die ene actie wijzigen.
- ⏳ Subscription / payments — leeg; sidebar toont alleen een "Subscribe"-knop. Polar / Stripe later toevoegen.