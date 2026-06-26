# Team-plan — Marktaanval (mens)

Doel: in ~7 werkuren een schaalbare, werkende demo bouwen zonder dat de 3 werkstromen botsen.

## 3 werkstromen (parallel, eigen scope)
1. **Research & tooling** — virale video's analyseren, scrape-aanpak, generatie-tools, beeld→video.
2. **Backend & dashboard** — integratie, jobs, data, dashboard.
3. **Frontend** — landing page, login, app-UI.

## Anti-conflict: het contract (eerst, samen, vóór er gebouwd wordt)
Mappen scheiden is niet genoeg — werkstromen botsen op de *data*. Bevries vooraf:
- Het centrale object dat door alle 8 stappen loopt (Project → Template → Brief → Script/Beats → Images → Voice → Clips → Final) — zie de 8 stappen in [../PROJECT.md](../PROJECT.md).
- De koppeling frontend ⇆ backend (welke data, welke status).
- De credit-economie (kost per stap) — nu ontwerpen, later bouwen.

*(Placeholder — samen invullen.)*

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