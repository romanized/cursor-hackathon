# Testing

A no-frameworks checklist for verifying the dashboard end-to-end. Run from
`dashboard/` with `npm run dev` and a populated `.env.local`.

## Pre-flight (one-time)

- [ ] `npm install` clean.
- [ ] `npx tsc --noEmit` passes.
- [ ] All three Supabase keys in `.env.local`; `APIFY_TOKEN` + `ELEVENLABS_API_KEY` set.
- [ ] Google OAuth enabled in the Supabase dashboard if you want to test that path.

## End-to-end demo (the "happy path")

Pick a real product URL with a clean Open Graph image; Amazon detail pages and
Shopify storefronts both work.

1. **Login.** Visit `/`. You're redirected to `/login`.
   - Send code, paste 6-digit OTP from email.
   - You land on `/create`. Sidebar shows your email + 10 credits.
2. **Create.** Click *Start a new project*. URL becomes `/create/<uuid>/template`.
3. **Template.** Pick *Skeleton AI* (or any active). Continue.
4. **Product.** Paste your URL, press Scrape. Wait ~15–30s.
   - Right column shows the OG image + the first ~400 chars of description.
   - Fill the brief: product name, audience, 2-3 pains, 2-3 benefits.
   - Pick runtime (Hook = 1 credit). Save brief & continue.
5. **Script.** Write a short voiceover (~2 sentences) and at least 3 beats.
   - Confirm. Credits drop by 1 (check the sidebar or `/billing`).
6. **Images.** Upload one image per beat. Continue to voiceover.
7. **Voice.** Render voiceover. Audio player appears.
8. **Clips.** Render still clips. Continue.
9. **Assemble.** Assemble final cut. You're sent to `/film`.
10. **Film.** Slideshow plays through the beats while the voiceover plays.

## Resilience checks

- **Drafts persist.** Refresh on any step — your inputs are still there.
- **Step gating.** From `/film`, the step strip still lets you click any step
  back. From a fresh draft, you can't click past *Template* — only the next
  available step is enabled.
- **Insufficient credits.** Manually set `profiles.credits` to 0 in the
  dashboard, then try to confirm script — you should see
  `Not enough credits — subscribe in the sidebar.` and no ledger entry.
- **Scrape failure.** Paste a deliberately-broken URL (e.g. `https://example.invalid`).
  The product card switches to "failed" with an error message; the brief
  editor stays usable.
- **Voice failure.** Temporarily set `ELEVENLABS_API_KEY=bogus`, re-render.
  The asset row records `status='failed'` and the page surfaces the error.
- **Sign out.** From `/account`, sign out lands you on `/login` and visiting
  any `/create/*` URL re-redirects to login.

## Supabase advisors

After any migration or before pushing:

```bash
# via MCP — should return zero lints
get_advisors type=security
get_advisors type=performance
```
