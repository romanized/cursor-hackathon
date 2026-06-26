-- Template lineup tweak:
--   - Drop "Animated body part" — never shipped, low demand.
--   - Promote "AI streamer clip" to active.
--   - Add "Pibble dog" — friendly cartoon pitbull mascot variant.
-- Hidden (not deleted) so any FK-referenced projects stay intact.

update public.templates set status = 'hidden' where id = 'animated_body_part';

update public.templates
   set status = 'active', name = 'AI Streamer', sort_order = 40
 where id = 'ai_streamer_clip';

insert into public.templates (id, name, kind, status, description, featured, sort_order)
values
  ('pibble_dog', 'Pibble Dog', 'video', 'active',
   'Friendly cartoon pitbull mascot in soft 3D pixar-style render, holding the product.',
   false, 50)
on conflict (id) do update set
  name        = excluded.name,
  kind        = excluded.kind,
  status      = excluded.status,
  description = excluded.description,
  featured    = excluded.featured,
  sort_order  = excluded.sort_order;
