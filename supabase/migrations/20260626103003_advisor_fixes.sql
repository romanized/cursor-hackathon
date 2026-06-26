-- Advisor follow-ups for the core schema migration.

-- 1. handle_new_user() is SECURITY DEFINER and lives in `public`, so by default
--    `anon` and `authenticated` inherit EXECUTE via PUBLIC and could call it
--    through PostgREST /rpc/. Revoke it; the AFTER INSERT trigger on auth.users
--    still fires regardless of role EXECUTE grants.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- 2. Drop the orphan set_updated_at() function from the earlier init_schema
--    migration. We use extensions.moddatetime() instead; the function is unused
--    after the previous `projects` table was dropped, and the linter flags its
--    mutable search_path.
drop function if exists public.set_updated_at() cascade;
