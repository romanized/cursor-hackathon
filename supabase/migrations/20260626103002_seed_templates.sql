-- Seed the viral formats shown in Step 1 of the workflow.
-- Idempotent: re-running updates labels/status without duplicating rows.
-- To add a new format, append a row here (or insert at runtime) — no schema change.

insert into public.templates (id, name, kind, status, description, featured, sort_order)
values
  ('skeleton_ai',         'Skeleton AI',         'video', 'active', 'Most-used format. CGI skeleton scenes.', true,  10),
  ('cartoon',             'Cartoon',             'video', 'active', 'Simpsons-style cartoon scenes.',         false, 20),
  ('cgi_3d',              '3D CGI',              'video', 'active', 'Photoreal 3D CGI character.',            false, 30),
  ('animated_body_part',  'Animated body part',  'video', 'soon',   'Animated body part hook.',               false, 40),
  ('ai_streamer_clip',    'AI streamer clip',    'video', 'soon',   'Streamer-style clip with AI overlay.',   false, 50)
on conflict (id) do update set
  name        = excluded.name,
  kind        = excluded.kind,
  status      = excluded.status,
  description = excluded.description,
  featured    = excluded.featured,
  sort_order  = excluded.sort_order;
