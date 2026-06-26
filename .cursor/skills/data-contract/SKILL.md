---
name: data-contract
description: Guards the UGC project's Supabase data contract (profiles, products, projects, beats, assets, credit_ledger, templates) and the storage `media` bucket. Use when writing or reviewing Supabase migrations, RLS policies, server actions that touch credits or generated media, or when adding a new viral format, generation step, or external provider in the cursor-hackathon repo.
---

# data-contract

The frozen schema lives in [`context/DATA-MODEL.md`](../../../context/DATA-MODEL.md)
and the migrations in [`supabase/migrations/`](../../../supabase/migrations/).
Read `DATA-MODEL.md` first when in doubt. This skill encodes the conventions that
keep new code consistent with that contract.

## Hard rules

1. **RLS on every public table.** Every policy uses `TO authenticated` **plus**
   an ownership predicate. `TO authenticated` alone is BOLA — reject it.
2. **`(select auth.uid())`** in policy bodies, not bare `auth.uid()` (cached
   per-query).
3. **UPDATE policies have both `USING` and `WITH CHECK`** so a user can't
   reassign rows to another `user_id`.
4. **Ownership**: top-level tables own via `user_id` (or `id` on `profiles`).
   Child tables (`beats`, `assets`) check via
   `exists (select 1 from public.projects p where p.id = <child>.project_id and p.user_id = (select auth.uid()))`.
5. **FK index on every foreign key.** Already true today — keep it true.
6. **`updated_at`** on every mutable table, via `extensions.moddatetime`. Add
   the trigger when you add the column.
7. **Credit writes go through server actions with the `service_role` key**, in
   a transaction: read balance → update `profiles.credits` → insert
   `credit_ledger` row with `balance_after`. Never let the client mutate
   credits.
8. **Generated media lands in `storage.media` under `<user_id>/<project_id>/<asset_id>.<ext>`.**
   The first folder segment must be the owner's `auth.uid()` — the storage
   policies depend on this.

## Picking where new data goes

| You want to model… | Put it here |
|---|---|
| A new viral format | `insert into templates (...)`. No migration needed. |
| A new brief field that the UI queries/filters on | New column on `projects`. |
| A new brief field that's just stored/displayed | `projects.meta jsonb`. |
| A new generation step / asset type | New value in the `asset_kind` enum; reuse `assets`. Only fork a new table if it has a different lifecycle. |
| A new external provider | Set `assets.provider` + `provider_ref`. Extra fields go under `assets.meta`. |
| Async job state | `assets.status` + `attempts` + `error` (the embedded job model). Don't add a `jobs` table unless we move to a real queue. |
| Credits / pricing knobs | Hardcode in the server-action constants for now. Only add a `plans` table when we ship real billing. |

## Lifecycles to respect

- `projects.status`: `draft` → `generating` → `ready` | `failed`; `archived` from any state.
- `projects.current_step`: 1..8, used to resume drafts. Bump it when the step's
  data is written, not when the user clicks Next.
- `job_status` (on `products.scrape_status` and `assets.status`):
  `pending` → `processing` → `ready` | `failed`.
- The UI subscribes on these — flip them as you go or the screen hangs.

## Migration workflow

1. `supabase migration new <descriptive_name>` — never invent filenames.
2. Write SQL. Match the style in existing migrations (lowercase identifiers,
   header comment explaining intent, FK indexes, triggers next to their tables).
3. If the change is contract-visible (new column/table/enum value), update
   [`context/DATA-MODEL.md`](../../../context/DATA-MODEL.md) in the **same** commit.
4. `supabase db push` (or `db reset` locally) to verify it applies cleanly.
5. `supabase db advisors` (or MCP `get_advisors`) — fix anything it flags.

## Anti-patterns to reject on sight

- `auth.role() = 'authenticated'` — deprecated, also breaks under anonymous sign-ins. Use `TO authenticated` + ownership predicate.
- `SECURITY DEFINER` added to "fix" a permission error. Find the real cause.
- Views without `WITH (security_invoker = true)` (PG15+).
- A new table without RLS enabled, or with policies that lack `WITH CHECK` on UPDATE.
- Client code mutating `profiles.credits` directly — must go through a server action.
- A new column on `projects` that duplicates something already in `meta`, or vice versa (think before picking).
- A new `jobs`/`generations`/`renders` table — we already have `assets` doing that job.
