#!/usr/bin/env bash
# Apply schema to your linked Supabase project (no dashboard copy-paste).
# Prereqs: 1) Create project at https://supabase.com/dashboard
#          2) npx supabase login
#          3) npx supabase link --project-ref YOUR_REF  (Ref = Project Settings → General → Reference ID)

set -e
cd "$(dirname "$0")/.."

if ! command -v supabase &>/dev/null; then
  echo "Supabase CLI not found. Run: npx supabase db push"
  exit 1
fi

echo "Pushing migrations..."
if ! supabase db push; then
  echo ""
  echo "If 'project not linked': run once: npx supabase login"
  echo "Then: npx supabase link --project-ref YOUR_PROJECT_REF"
  echo "Get YOUR_PROJECT_REF from: Dashboard → Project Settings → General → Reference ID"
  exit 1
fi
echo "Done. Add NEXT_PUBLIC_SUPABASE_URL and keys from Dashboard → API to .env"
