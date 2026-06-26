#!/usr/bin/env bash
# One-shot DB setup for teammates. Run from the repo root:  ./scripts/setup-db.sh
# Connects YOUR machine to the shared Supabase project. Run once after cloning.
set -euo pipefail

PROJECT_REF="olwftiuxzjdhsnvllzif"

echo "==> cursor-hackathon · Supabase setup"

# 1. Supabase CLI present?
if ! command -v supabase >/dev/null 2>&1; then
  echo "!! Supabase CLI not found. Install it: https://supabase.com/docs/guides/cli"
  echo "   macOS:  brew install supabase/tap/supabase"
  exit 1
fi

# 2. .env from template
if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env from .env.example."
  echo "    Fill in SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)"
  echo "    and the keys from Dashboard -> Project Settings -> API."
else
  echo "==> .env already exists, leaving it as-is."
fi

# 3. Login (interactive; skips if already logged in)
if supabase projects list >/dev/null 2>&1; then
  echo "==> Supabase CLI already logged in."
else
  echo "==> Logging in to Supabase (paste your personal access token when asked)..."
  supabase login
fi

# 4. Link this clone to the shared project
echo "==> Linking to project $PROJECT_REF ..."
supabase link --project-ref "$PROJECT_REF"

# 5. Apply the latest schema locally-tracked migrations to the remote DB (idempotent)
echo "==> Pulling latest schema state (supabase db pull) ..."
supabase db pull || echo "   (db pull skipped — needs DB password; not required to start)"

echo ""
echo "==> Done. You're connected to the shared DB."
echo "    - Schema changes:  supabase migration new <name>  ->  edit SQL  ->  supabase db push"
echo "    - Agent/MCP:       restart Cursor and authorize the Supabase MCP server."
