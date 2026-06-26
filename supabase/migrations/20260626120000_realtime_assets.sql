-- Publish `assets` to supabase_realtime so the wizard can subscribe to
-- per-beat status updates (Step 4 images, Step 6 Veo clips) and render live
-- progress without polling. RLS still applies to the realtime stream — users
-- only receive events for rows their policy lets them SELECT.
alter publication supabase_realtime add table public.assets;
