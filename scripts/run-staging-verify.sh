#!/usr/bin/env bash
#
# run-staging-verify.sh — wrapper around verify-supabase.sh that takes
# staging credentials as positional args instead of forcing the user
# to export env vars manually. Avoids zsh-paste-of-JWT-with-dots
# parse errors.
#
# Usage:
#   bash scripts/run-staging-verify.sh \
#     <STAGING_REF> \
#     <ANON_KEY> \
#     <SERVICE_KEY> \
#     <DB_PASSWORD>
#
# Each argument should be passed in SINGLE QUOTES so zsh doesn't
# interpret special chars:
#   bash scripts/run-staging-verify.sh \
#     'rwtsznxfdfgkswvgwypw' \
#     '<anon-key-jwt>' \
#     '<service-role-key-jwt>' \
#     'your-db-password'

set -u

if [ "$#" -ne 4 ]; then
  cat <<USAGE
Usage: bash scripts/run-staging-verify.sh <STAGING_REF> <ANON_KEY> <SERVICE_KEY> <DB_PASSWORD>

Get these values from the Supabase staging dashboard:
  STAGING_REF   → the 20-char string after /project/ in the URL
                  (rwtsznxfdfgkswvgwypw for krs-staging)
  ANON_KEY      → Settings → API → "anon public" key
  SERVICE_KEY   → Settings → API → "service_role secret" key
  DB_PASSWORD   → the password you generated when you created the project
                  (or reset via Settings → Database → Database password)
USAGE
  exit 2
fi

STAGING_REF="$1"
ANON_KEY="$2"
SERVICE_KEY="$3"
DB_PASSWORD="$4"

# Build the canonical Supabase URLs from the ref
PROJECT_URL="https://${STAGING_REF}.supabase.co"
# Direct (non-pooled) DB connection. Port 5432.
# URL-encode the password in case it contains @ or :
DB_PASSWORD_ENC="$(printf '%s' "$DB_PASSWORD" | jq -sRr @uri)"
DB_URL="postgresql://postgres:${DB_PASSWORD_ENC}@db.${STAGING_REF}.supabase.co:5432/postgres"

echo "Running verification against:"
echo "  PROJECT_URL = $PROJECT_URL"
echo "  DB_URL      = postgresql://postgres:****@db.${STAGING_REF}.supabase.co:5432/postgres"
echo "  MODE        = staging"
echo

export PROJECT_URL ANON_KEY SERVICE_KEY DB_URL
export MODE=staging

exec bash "$(dirname "$0")/verify-supabase.sh"
