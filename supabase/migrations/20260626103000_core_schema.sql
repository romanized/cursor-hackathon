-- Core schema for the UGC hook-video generator.
-- One central `projects` row walks the 8-step workflow (template -> brief -> script ->
-- images -> voice -> clips -> assemble -> film). See context/DATA-MODEL.md.

-- Replace the placeholder `projects` table from the earlier `init_schema`
-- migration (empty, owner_id/input/status shape). The contract below supersedes it.
drop table if exists public.projects cascade;

create extension if not exists pgcrypto;
create extension if not exists moddatetime schema extensions;

-- ============================================================================
-- Enums
-- ============================================================================

create type public.template_kind   as enum ('video', 'slideshow');
create type public.template_status as enum ('active', 'soon', 'hidden');
create type public.product_source  as enum ('url', 'screenshot', 'manual');
-- job_status doubles as scrape status and per-asset generation status.
create type public.job_status      as enum ('pending', 'processing', 'ready', 'failed');
create type public.project_status  as enum ('draft', 'generating', 'ready', 'failed', 'archived');
create type public.runtime         as enum ('hook', 'full');
create type public.asset_kind      as enum ('image', 'voiceover', 'clip', 'final');

-- ============================================================================
-- profiles: 1:1 with auth.users, holds credit balance.
-- ============================================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  display_name text,
  credits     integer not null default 10 check (credits >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function extensions.moddatetime(updated_at);

-- Auto-create a profile when a new auth user is inserted.
-- SECURITY DEFINER because auth.users is owned by supabase_auth_admin; we only
-- touch our own profiles row. Kept in `public` for simplicity; the function
-- body has no user-controlled SQL so it is safe.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- credit_ledger: append-only credit transactions.
-- ============================================================================

create table public.credit_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  project_id    uuid,  -- FK added after projects exists
  delta         integer not null,
  reason        text not null,
  balance_after integer not null,
  created_at    timestamptz not null default now()
);

create index credit_ledger_user_id_created_at_idx
  on public.credit_ledger (user_id, created_at desc);

-- ============================================================================
-- templates: viral formats. New formats = insert a row, no migration.
-- ============================================================================

create table public.templates (
  id          text primary key,           -- e.g. 'skeleton_ai'
  name        text not null,
  kind        public.template_kind not null,
  status      public.template_status not null default 'active',
  description text,
  preview_url text,                       -- thumbnail / sample image
  featured    boolean not null default false,
  sort_order  integer not null default 100,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger templates_updated_at
  before update on public.templates
  for each row execute function extensions.moddatetime(updated_at);

-- ============================================================================
-- products: scraped product info. Reusable across projects.
-- ============================================================================

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  source_type   public.product_source not null,
  source_url    text,
  scrape_status public.job_status not null default 'pending',
  apify_run_id  text,                     -- ties back to the Apify run
  name          text,
  description   text,
  images        jsonb not null default '[]'::jsonb,  -- array of {url, alt?}
  raw           jsonb,                    -- full Apify output, untouched
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index products_user_id_idx     on public.products (user_id);
create index products_created_at_idx  on public.products (user_id, created_at desc);

create trigger products_updated_at
  before update on public.products
  for each row execute function extensions.moddatetime(updated_at);

-- ============================================================================
-- projects: the draft/central object that walks the 8 steps.
-- ============================================================================

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  template_id     text references public.templates(id) on delete set null,
  title           text,
  media_type      public.template_kind not null default 'video',
  runtime         public.runtime not null default 'hook',
  captions        boolean not null default true,
  status          public.project_status not null default 'draft',
  current_step    smallint not null default 1 check (current_step between 1 and 8),
  -- Brief (Step 2)
  product_name    text,
  target_audience text,
  customer_issues text[] not null default '{}',
  benefits        text[] not null default '{}',
  -- Script (Step 3) — beats live in their own table
  voiceover_script text,
  -- Escape hatch for future per-project knobs without a migration
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index projects_user_id_idx          on public.projects (user_id);
create index projects_user_status_idx      on public.projects (user_id, status);
create index projects_product_id_idx       on public.projects (product_id);
create index projects_template_id_idx      on public.projects (template_id);
create index projects_user_updated_at_idx  on public.projects (user_id, updated_at desc);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function extensions.moddatetime(updated_at);

alter table public.credit_ledger
  add constraint credit_ledger_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete set null;

create index credit_ledger_project_id_idx on public.credit_ledger (project_id);

-- ============================================================================
-- beats: Step 3 beat breakdown for a project.
-- ============================================================================

create table public.beats (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  idx           smallint not null,
  label         text,
  text          text not null,
  visual_prompt text,
  duration_ms   integer,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (project_id, idx)
);

create index beats_project_id_idx on public.beats (project_id);

create trigger beats_updated_at
  before update on public.beats
  for each row execute function extensions.moddatetime(updated_at);

-- ============================================================================
-- assets: every generated media + its async job status (Steps 4-8).
-- ponytail: embedded status IS the job model. Upgrade path = dedicated jobs
-- table only if we add real queues/retries.
-- ============================================================================

create table public.assets (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  beat_id       uuid references public.beats(id) on delete cascade,  -- null for project-level voiceover/final
  kind          public.asset_kind not null,
  status        public.job_status not null default 'pending',
  provider      text,                     -- 'elevenlabs', 'nano_banana', 'apify', ...
  provider_ref  text,                     -- external job/run id
  storage_path  text,                     -- path inside the `media` bucket
  url           text,                     -- public/signed URL for convenience
  attempts      smallint not null default 0,
  error         text,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index assets_project_id_idx          on public.assets (project_id);
create index assets_beat_id_idx             on public.assets (beat_id);
create index assets_project_kind_idx        on public.assets (project_id, kind);
create index assets_status_idx              on public.assets (status) where status in ('pending', 'processing');

create trigger assets_updated_at
  before update on public.assets
  for each row execute function extensions.moddatetime(updated_at);
