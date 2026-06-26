-- Seed the viral formats shown in Step 1 of the workflow.
-- Idempotent: re-running updates labels/status without duplicating rows.
-- To add a new format, append a row here (or insert at runtime) — no schema change.

insert into public.templates (id, name, kind, status, description, featured, sort_order)
values
  ('skeleton_ai',         'Skeleton AI',         'video', 'active', 'Most-used format. CGI skeleton scenes.',                                              true,  10),
  ('cartoon',             'Cartoon',             'video', 'active', 'Simpsons-style cartoon scenes.',                                                       false, 20),
  ('cgi_3d',              '3D CGI',              'video', 'active', 'Photoreal 3D CGI character.',                                                          false, 30),
  ('ai_streamer_clip',    'AI Streamer',         'video', 'active', 'Streamer webcam vibe with neon RGB lighting and the product on stream.',              false, 40),
  ('pibble_dog',          'Pibble Dog',          'video', 'active', 'Friendly cartoon pitbull mascot in soft 3D pixar-style render, holding the product.', false, 50)
on conflict (id) do update set
  name        = excluded.name,
  kind        = excluded.kind,
  status      = excluded.status,
  description = excluded.description,
  featured    = excluded.featured,
  sort_order  = excluded.sort_order;
