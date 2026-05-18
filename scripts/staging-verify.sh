#!/usr/bin/env bash
#
# staging-verify.sh — interactive wrapper. Asks for each credential
# one at a time, then runs verify-supabase.sh against staging.
#
# Usage: bash scripts/staging-verify.sh

set -u

STAGING_REF="rwtsznxfdfgkswvgwypw"  # krs-staging

echo "Staging verification setup."
echo "For each prompt, paste the value (it'll be hidden) and press Enter."
echo

printf "  1/3  ANON key (starts with eyJ...):  "
IFS= read -rs ANON_KEY
echo "[hidden, ${#ANON_KEY} chars]"

printf "  2/3  SERVICE_ROLE key (also eyJ...):  "
IFS= read -rs SERVICE_KEY
echo "[hidden, ${#SERVICE_KEY} chars]"

printf "  3/3  Full DB connection URI from dashboard
        (Connect > Direct > Session pooler, starts with postgresql://):  "
IFS= read -rs DB_URL_INPUT
echo "[hidden, ${#DB_URL_INPUT} chars]"

echo

# Sanity-check the inputs
if [ "${#ANON_KEY}" -lt 100 ] || [[ "$ANON_KEY" != eyJ* ]]; then
  echo "ANON_KEY looks wrong (${#ANON_KEY} chars, prefix '${ANON_KEY:0:3}'). Re-run and re-paste."
  exit 2
fi
if [ "${#SERVICE_KEY}" -lt 100 ] || [[ "$SERVICE_KEY" != eyJ* ]]; then
  echo "SERVICE_KEY looks wrong (${#SERVICE_KEY} chars, prefix '${SERVICE_KEY:0:3}'). Re-run and re-paste."
  exit 2
fi
if [[ "$DB_URL_INPUT" != postgresql://* && "$DB_URL_INPUT" != postgres://* ]]; then
  echo "DB URI must start with postgresql:// — got '${DB_URL_INPUT:0:15}...'. Re-run and re-paste."
  exit 2
fi

# If the URI still has the [YOUR-PASSWORD] placeholder, substitute it.
if [[ "$DB_URL_INPUT" == *"[YOUR-PASSWORD]"* ]]; then
  printf "  Pasted URI has [YOUR-PASSWORD] placeholder. Paste the DB password now:  "
  IFS= read -rs DB_PW
  echo "[hidden, ${#DB_PW} chars]"
  if command -v jq >/dev/null 2>&1; then
    DB_PW_ENC="$(printf '%s' "$DB_PW" | jq -sRr @uri)"
  else
    DB_PW_ENC="$DB_PW"
  fi
  DB_URL_INPUT="${DB_URL_INPUT//\[YOUR-PASSWORD\]/$DB_PW_ENC}"
fi

echo "Looks plausible. Running verification..."
echo

export PROJECT_URL="https://${STAGING_REF}.supabase.co"
export ANON_KEY
export SERVICE_KEY
export DB_URL="$DB_URL_INPUT"
export MODE=staging

exec bash "$(dirname "$0")/verify-supabase.sh"
