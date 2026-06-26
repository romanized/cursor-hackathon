-- RLS policies and storage bucket for user-generated media.
-- Convention: every row that belongs to a user is reachable only by that user.
-- beats/assets piggyback on projects.user_id to avoid a denormalized column.
-- Server actions use the service_role key to write credits / generation output;
-- the policies below cover the client/anon paths.

-- ============================================================================
-- Enable RLS
-- ============================================================================

alter table public.profiles      enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.templates     enable row level security;
alter table public.products      enable row level security;
alter table public.projects      enable row level security;
alter table public.beats         enable row level security;
alter table public.assets        enable row level security;

-- ============================================================================
-- profiles
-- ============================================================================

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ============================================================================
-- credit_ledger: read-only for the owner; writes go through service_role.
-- ============================================================================

create policy "credit_ledger_select_own" on public.credit_ledger
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- templates: public read, no client writes.
-- ============================================================================

create policy "templates_select_all" on public.templates
  for select to anon, authenticated
  using (true);

-- ============================================================================
-- products
-- ============================================================================

create policy "products_select_own" on public.products
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "products_insert_own" on public.products
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "products_update_own" on public.products
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "products_delete_own" on public.products
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- projects
-- ============================================================================

create policy "projects_select_own" on public.projects
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "projects_insert_own" on public.projects
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "projects_update_own" on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "projects_delete_own" on public.projects
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- beats: ownership via projects.user_id.
-- ============================================================================

create policy "beats_select_own" on public.beats
  for select to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = beats.project_id and p.user_id = (select auth.uid())
  ));

create policy "beats_insert_own" on public.beats
  for insert to authenticated
  with check (exists (
    select 1 from public.projects p
    where p.id = beats.project_id and p.user_id = (select auth.uid())
  ));

create policy "beats_update_own" on public.beats
  for update to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = beats.project_id and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = beats.project_id and p.user_id = (select auth.uid())
  ));

create policy "beats_delete_own" on public.beats
  for delete to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = beats.project_id and p.user_id = (select auth.uid())
  ));

-- ============================================================================
-- assets: same pattern as beats.
-- ============================================================================

create policy "assets_select_own" on public.assets
  for select to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = assets.project_id and p.user_id = (select auth.uid())
  ));

create policy "assets_insert_own" on public.assets
  for insert to authenticated
  with check (exists (
    select 1 from public.projects p
    where p.id = assets.project_id and p.user_id = (select auth.uid())
  ));

create policy "assets_update_own" on public.assets
  for update to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = assets.project_id and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = assets.project_id and p.user_id = (select auth.uid())
  ));

create policy "assets_delete_own" on public.assets
  for delete to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = assets.project_id and p.user_id = (select auth.uid())
  ));

-- ============================================================================
-- Storage: one private bucket for all generated media.
-- Paths follow `<user_id>/<project_id>/<asset_id>.<ext>` so the first folder
-- segment is the owning auth.uid(). Upsert needs INSERT + SELECT + UPDATE.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

create policy "media_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "media_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "media_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "media_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
