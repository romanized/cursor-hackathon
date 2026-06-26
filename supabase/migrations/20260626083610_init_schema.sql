-- Baseline schema for the AI UGC hook-video generator.
-- The `projects` row is the central object that runs through all 8 steps
-- (Project -> Template -> Brief -> Script/Beats -> Images -> Voice -> Clips -> Final).
-- Edit/extend this as the data contract firms up (see context/TEAM-PLAN.md).

create extension if not exists "pgcrypto";

-- One row per product/ad the user is generating.
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  -- Free-form product input: link / screenshot / manual fields, plus derived
  -- brief (problem, who, benefits). Loosely typed for now; tighten later.
  input       jsonb not null default '{}'::jsonb,
  status      text  not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects (owner_id);

-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Row Level Security: secure by default. A user only sees their own projects.
alter table public.projects enable row level security;

drop policy if exists "owner can read own projects"   on public.projects;
drop policy if exists "owner can insert own projects" on public.projects;
drop policy if exists "owner can update own projects" on public.projects;
drop policy if exists "owner can delete own projects" on public.projects;

create policy "owner can read own projects"
  on public.projects for select
  using ( auth.uid() = owner_id );

create policy "owner can insert own projects"
  on public.projects for insert
  with check ( auth.uid() = owner_id );

create policy "owner can update own projects"
  on public.projects for update
  using ( auth.uid() = owner_id )
  with check ( auth.uid() = owner_id );

create policy "owner can delete own projects"
  on public.projects for delete
  using ( auth.uid() = owner_id );
