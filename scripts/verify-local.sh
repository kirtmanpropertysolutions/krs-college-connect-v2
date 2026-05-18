#!/usr/bin/env bash
#
# verify-local.sh — automated execution of the LOCAL portions of
# VERIFICATION_CHECKLIST.md sections 1.2, 2.1, 4.1, 4.3, 4.4, 5.1, 5.4.
#
# Usage:
#   1. Make sure local Supabase is running:
#        cd /Users/claudiakirtman/krs-v2 && supabase status
#      If not running:
#        supabase start
#      then re-run this.
#
#   2. From the repo root:
#        bash scripts/verify-local.sh
#
#   3. Paste the entire output back to the chat. The script exits 0
#      on full pass, 1 on any failure.
#
# Requires: psql, jq, curl, supabase CLI.
#
# Does NOT cover sections 6 (browser signup flow) and 7 (public profile
# browser test) — those require Chrome DevTools and visual inspection.
# Run those manually after this script passes.

set -u  # error on undefined vars (NOT -e — we want to continue on failure)

# ── Pretty output ──────────────────────────────────────────────────
RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
PASS_COUNT=0
FAIL_COUNT=0
FAIL_LIST=()

header() {
  echo
  echo "${BOLD}════════════════════════════════════════════════════════════════${RESET}"
  echo "${BOLD}  $1${RESET}"
  echo "${BOLD}════════════════════════════════════════════════════════════════${RESET}"
}

step() {
  echo
  echo "${BOLD}▶ $1${RESET}"
}

cmd() {
  echo "${YELLOW}\$ $*${RESET}"
}

pass() {
  echo "${GREEN}✓ PASS — $1${RESET}"
  PASS_COUNT=$((PASS_COUNT+1))
}

fail() {
  echo "${RED}✗ FAIL — $1${RESET}"
  FAIL_COUNT=$((FAIL_COUNT+1))
  FAIL_LIST+=("$1")
}

# ── Detect local Supabase ──────────────────────────────────────────
header "Detecting local Supabase"

for tool in supabase psql jq curl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "${RED}MISSING TOOL: $tool${RESET}"
    echo "Install with: brew install $tool  (use 'libpq' for psql, 'supabase/tap/supabase' for supabase)"
    exit 2
  fi
done

if ! supabase status >/dev/null 2>&1; then
  echo "${RED}Local Supabase is not running.${RESET}"
  echo "Start it with: cd $(pwd) && supabase start"
  exit 2
fi

DB_URL="$(supabase status -o env 2>/dev/null | awk -F= '/^DB_URL=/{print $2}' | tr -d '"')"
PROJECT_URL="$(supabase status -o env 2>/dev/null | awk -F= '/^API_URL=/{print $2}' | tr -d '"')"
ANON_KEY="$(supabase status -o env 2>/dev/null | awk -F= '/^ANON_KEY=/{print $2}' | tr -d '"')"
SERVICE_KEY="$(supabase status -o env 2>/dev/null | awk -F= '/^SERVICE_ROLE_KEY=/{print $2}' | tr -d '"')"

# Fallback parsing (older supabase CLI versions)
if [ -z "$DB_URL" ]; then
  DB_URL="$(supabase status 2>/dev/null | awk '/DB URL/{print $NF}')"
  PROJECT_URL="$(supabase status 2>/dev/null | awk '/API URL/{print $NF}')"
  ANON_KEY="$(supabase status 2>/dev/null | awk '/anon key/{print $NF}')"
  SERVICE_KEY="$(supabase status 2>/dev/null | awk '/service_role key/{print $NF}')"
fi

if [ -z "$DB_URL" ] || [ -z "$PROJECT_URL" ] || [ -z "$ANON_KEY" ]; then
  echo "${RED}Could not parse 'supabase status' output. Run it manually:${RESET}"
  supabase status
  exit 2
fi

echo "DB_URL      = $DB_URL"
echo "PROJECT_URL = $PROJECT_URL"
echo "ANON_KEY    = ${ANON_KEY:0:30}..."

# ── Section 1.2 — migrations applied ───────────────────────────────
header "§1.2 — Confirm migrations 044–048 applied"

step "Listing applied migrations 044-048"
cmd "psql \"\$DB_URL\" -c \"select version, name from supabase_migrations.schema_migrations where version in ('044','045','046','047','048') order by version;\""

MIG_OUT="$(psql "$DB_URL" -At -c "select version || '|' || name from supabase_migrations.schema_migrations where version in ('044','045','046','047','048') order by version;" 2>&1)"
echo "$MIG_OUT"

EXPECTED=("044|security_hardening_with_check" "045|public_profile_privacy" "046|performance_indexes" "047|atomic_invite_consume" "048|public_profile_rpcs")
ALL_PRESENT=true
for e in "${EXPECTED[@]}"; do
  if ! grep -qx "$e" <<<"$MIG_OUT"; then
    ALL_PRESENT=false
    echo "${RED}Missing: $e${RESET}"
  fi
done

if $ALL_PRESENT; then
  pass "All five migration rows present"
else
  fail "§1.2 — one or more migrations not applied; run 'supabase db reset' and re-run this script"
fi

# ── Section 2.1 — WITH CHECK clauses on every INSERT policy ────────
header "§2.1 — Confirm WITH CHECK clauses on INSERT/UPDATE policies"

step "Listing INSERT/UPDATE policies missing a WITH CHECK clause"
cmd "psql \"\$DB_URL\" -c \"select polname, polrelid::regclass ... where polcmd in ('a','*','w') and polwithcheck is null;\""

MISSING_WITH_CHECK="$(psql "$DB_URL" -At -F'|' -c "
  select polname || '|' || polrelid::regclass::text
  from pg_policy
  where polrelid::regclass::text in (
    'profiles','athletes','pipelines','outreach','highlights',
    'highlight_videos','athlete_milestones','school_notes',
    'recruiting_activity','org_members','invite_codes',
    'announcements','id_camps'
  )
    and polcmd in ('a','*','w')
    and polwithcheck is null;
" 2>&1)"

if [ -z "$MISSING_WITH_CHECK" ]; then
  pass "Every INSERT/UPDATE policy on the 13 audited tables has a WITH CHECK clause"
else
  echo "${RED}Policies missing WITH CHECK (impersonation vulnerability):${RESET}"
  echo "$MISSING_WITH_CHECK"
  fail "§2.1 — migration 044 not fully applied; impersonation hole remains"
fi

step "Sample of WITH CHECK clauses (first 5 INSERT policies)"
psql "$DB_URL" -c "
  select polname, polrelid::regclass as table,
         pg_get_expr(polwithcheck, polrelid) as with_check
  from pg_policy
  where polrelid::regclass::text in (
    'profiles','athletes','pipelines','outreach','highlights',
    'highlight_videos','athlete_milestones')
    and polcmd in ('a')
  order by table, polname
  limit 5;
"

# ── Section 4.1 — consume_invite_code exists with right signature ──
header "§4.1 — Confirm consume_invite_code RPC"

step "Function metadata"
cmd "psql \"\$DB_URL\" -c \"select proname, pg_get_function_identity_arguments(oid), ...\""

FN_META="$(psql "$DB_URL" -At -F'|' -c "
  select proname,
         pg_get_function_identity_arguments(oid),
         pg_get_function_result(oid),
         prosecdef,
         coalesce(array_to_string(proconfig, ','), '')
  from pg_proc
  where proname = 'consume_invite_code';
" 2>&1)"

echo "$FN_META"

if [ -z "$FN_META" ]; then
  fail "§4.1 — consume_invite_code function does not exist; migration 047 not applied"
else
  IS_SECDEF="$(echo "$FN_META" | cut -d'|' -f4)"
  CFG="$(echo "$FN_META" | cut -d'|' -f5)"
  RET="$(echo "$FN_META" | cut -d'|' -f3)"
  ARG="$(echo "$FN_META" | cut -d'|' -f2)"

  if [ "$IS_SECDEF" = "t" ] && [[ "$CFG" == *"search_path=public, pg_temp"* || "$CFG" == *"search_path=public,pg_temp"* ]] && [ "$ARG" = "p_code text" ] && [[ "$RET" == *"org_id uuid"* && "$RET" == *"ok boolean"* && "$RET" == *"reason text"* ]]; then
    pass "consume_invite_code is SECURITY DEFINER with locked search_path and correct signature"
  else
    fail "§4.1 — consume_invite_code exists but signature/security flags are wrong: secdef=$IS_SECDEF config=$CFG ret=$RET arg=$ARG"
  fi
fi

step "EXECUTE grants on consume_invite_code"
GRANTS="$(psql "$DB_URL" -At -F'|' -c "
  select grantee, privilege_type
  from information_schema.role_routine_grants
  where routine_schema = 'public'
    and routine_name = 'consume_invite_code'
  order by grantee;
" 2>&1)"
echo "$GRANTS"

# Should only have service_role with EXECUTE (no anon, no authenticated, no PUBLIC).
BAD_GRANTS="$(echo "$GRANTS" | grep -E '^(anon|authenticated|public)\|' || true)"
if [ -z "$BAD_GRANTS" ] && grep -q '^service_role|EXECUTE$' <<<"$GRANTS"; then
  pass "EXECUTE on consume_invite_code restricted to service_role only"
else
  fail "§4.1 — wrong grants on consume_invite_code: $GRANTS"
fi

# ── Section 4.3 — Functional test ──────────────────────────────────
header "§4.3 — Sequential consume tests"

# Pick or create a test org for our invite codes
ORG_ID="$(psql "$DB_URL" -At -c "select id from organizations limit 1;" 2>/dev/null)"
if [ -z "$ORG_ID" ]; then
  echo "${YELLOW}No organizations exist in local DB. Creating a throwaway test org...${RESET}"
  ORG_ID="$(psql "$DB_URL" -At -c "
    insert into organizations (name, slug)
    values ('Verification Test Org', 'verify-test-org')
    on conflict (slug) do update set name = excluded.name
    returning id;
  " 2>&1)"
fi
echo "Using ORG_ID=$ORG_ID"

# Cleanup any prior failed-run leftovers
psql "$DB_URL" -c "delete from invite_codes where code in ('VERIFY-SEQ', 'VERIFY-RACE');" >/dev/null 2>&1

step "Create invite code with max_uses=2"
psql "$DB_URL" -c "
  insert into invite_codes (code, org_id, max_uses, uses, active)
  values ('VERIFY-SEQ', '$ORG_ID', 2, 0, true);
" >/dev/null

step "First consume — should succeed"
R1="$(psql "$DB_URL" -At -F'|' -c "select * from consume_invite_code('VERIFY-SEQ');" 2>&1)"
echo "$R1"
if [[ "$R1" == *"|t|"* ]]; then pass "First consume returns ok=t"; else fail "§4.3 — first consume should succeed: $R1"; fi

step "Second consume — should succeed"
R2="$(psql "$DB_URL" -At -F'|' -c "select * from consume_invite_code('VERIFY-SEQ');" 2>&1)"
echo "$R2"
if [[ "$R2" == *"|t|"* ]]; then pass "Second consume returns ok=t"; else fail "§4.3 — second consume should succeed: $R2"; fi

step "Third consume — should fail with reason=exhausted"
R3="$(psql "$DB_URL" -At -F'|' -c "select * from consume_invite_code('VERIFY-SEQ');" 2>&1)"
echo "$R3"
if [[ "$R3" == *"|f|exhausted"* ]]; then pass "Third consume returns ok=f reason=exhausted"; else fail "§4.3 — third consume should be exhausted: $R3"; fi

step "Non-existent code — should fail with reason=not_found"
R4="$(psql "$DB_URL" -At -F'|' -c "select * from consume_invite_code('DOES-NOT-EXIST-${RANDOM}');" 2>&1)"
echo "$R4"
if [[ "$R4" == *"|f|not_found"* ]]; then pass "Non-existent code returns ok=f reason=not_found"; else fail "§4.3 — bad code should be not_found: $R4"; fi

# ── Section 4.4 — Concurrency test ─────────────────────────────────
header "§4.4 — Concurrent consume race (max_uses=3 vs 10 parallel)"

step "Reset invite to max_uses=3, uses=0"
psql "$DB_URL" -c "
  insert into invite_codes (code, org_id, max_uses, uses, active)
  values ('VERIFY-RACE', '$ORG_ID', 3, 0, true);
" >/dev/null

step "Fire 10 parallel consume_invite_code('VERIFY-RACE') calls"
cmd "for i in {1..10}; do (psql \"\$DB_URL\" -At -c \"select ok from consume_invite_code('VERIFY-RACE');\" &) ; done; wait"

# Use a temp file to collect results from background subshells
TMPF="$(mktemp)"
for i in 1 2 3 4 5 6 7 8 9 10; do
  (psql "$DB_URL" -At -c "select ok from consume_invite_code('VERIFY-RACE');" 2>/dev/null >> "$TMPF") &
done
wait

TRUE_COUNT="$(grep -c '^t$' "$TMPF" 2>/dev/null || echo 0)"
FALSE_COUNT="$(grep -c '^f$' "$TMPF" 2>/dev/null || echo 0)"
echo "Successes: $TRUE_COUNT"
echo "Failures:  $FALSE_COUNT"
rm -f "$TMPF"

FINAL_USES="$(psql "$DB_URL" -At -c "select uses from invite_codes where code='VERIFY-RACE';")"
echo "Final uses column: $FINAL_USES"

if [ "$TRUE_COUNT" = "3" ] && [ "$FINAL_USES" = "3" ]; then
  pass "Exactly 3 of 10 parallel consumes succeeded; uses=3 (FOR UPDATE row lock works)"
else
  fail "§4.4 — RACE: expected 3 successes + uses=3; got $TRUE_COUNT successes, uses=$FINAL_USES"
fi

step "Cleanup test invite codes"
psql "$DB_URL" -c "delete from invite_codes where code in ('VERIFY-SEQ', 'VERIFY-RACE');" >/dev/null

# ── Section 5.1 — anon SELECT revoked ──────────────────────────────
header "§5.1 — Confirm anon has NO SELECT on sensitive tables"

step "Listing anon SELECT grants on sensitive tables"
cmd "psql \"\$DB_URL\" -c \"select grantee, table_name from information_schema.role_table_grants where grantee='anon' and table_schema='public' and privilege_type='SELECT' and table_name in (...);\""

LEAKED="$(psql "$DB_URL" -At -F'|' -c "
  select table_name
  from information_schema.role_table_grants
  where grantee = 'anon'
    and table_schema = 'public'
    and privilege_type = 'SELECT'
    and table_name in (
      'profiles','athletes','pipelines','outreach','highlights',
      'highlight_videos','athlete_milestones','school_notes',
      'recruiting_activity','scheduled_camps','camp_expenses'
    )
  order by table_name;
" 2>&1)"

if [ -z "$LEAKED" ]; then
  pass "Anon has zero SELECT grants on the 11 sensitive tables"
else
  echo "${RED}TABLES STILL READABLE BY ANON:${RESET}"
  echo "$LEAKED"
  fail "§5.1 — anon has direct SELECT on: $LEAKED. Migration 048 not fully applied."
fi

# ── Section 5.4 — RPC column allow-list & direct-table attack ──────
header "§5.4 — Public profile privacy: anon attack + RPC column whitelist"

step "Find a real athlete UUID to query"
TARGET_ID="$(psql "$DB_URL" -At -c "
  select p.id from profiles p
  join athletes a on a.user_id = p.id
  where p.role='athlete'
  limit 1;
" 2>&1)"

if [ -z "$TARGET_ID" ] || [[ "$TARGET_ID" == *"ERROR"* ]]; then
  echo "${YELLOW}No athletes in local DB. Creating a throwaway test athlete to verify column projection...${RESET}"
  # Create a fake auth user + profile + athlete with sensitive fields populated
  # so we can verify those don't leak through the RPC.
  TEST_UID="$(psql "$DB_URL" -At -c "
    insert into auth.users (id, email)
    values (gen_random_uuid(), 'verify-athlete@local.test')
    returning id;
  " 2>&1)"
  psql "$DB_URL" -c "
    insert into profiles (id, full_name, role, org_id)
    values ('$TEST_UID', 'Verify Athlete', 'athlete', '$ORG_ID')
    on conflict (id) do nothing;
    insert into athletes (user_id, position, class_year, gpa, sat_score, act_score, height_cm, weight_kg, intended_major)
    values ('$TEST_UID', 'Forward', 2027, '3.95', 1450, 32, 168, 60, 'Computer Science')
    on conflict (user_id) do update set
      gpa = excluded.gpa, sat_score = excluded.sat_score,
      act_score = excluded.act_score, height_cm = excluded.height_cm,
      weight_kg = excluded.weight_kg, intended_major = excluded.intended_major;
  " >/dev/null 2>&1
  TARGET_ID="$TEST_UID"
fi
echo "TARGET_ID=$TARGET_ID"

step "Test A — anon attempts direct SELECT * from athletes (the original 045 hole)"
cmd "curl -s \"\$PROJECT_URL/rest/v1/athletes?select=*&user_id=eq.\$TARGET_ID\" -H \"apikey: \$ANON_KEY\""
RESP_A="$(curl -s "$PROJECT_URL/rest/v1/athletes?select=*&user_id=eq.$TARGET_ID" -H "apikey: $ANON_KEY")"
echo "$RESP_A"

# Expect either [] or a permission-denied object. Either is acceptable.
if [ "$RESP_A" = "[]" ] || [[ "$RESP_A" == *"permission denied"* ]] || [[ "$RESP_A" == *"42501"* ]]; then
  pass "Anon direct SELECT on athletes is blocked"
elif [[ "$RESP_A" == *"gpa"* ]] || [[ "$RESP_A" == *"height_cm"* ]] || [[ "$RESP_A" == *"sat_score"* ]]; then
  fail "§5.4 Test A — CRITICAL: anon CAN read GPA/height/SAT directly. Migration 048 NOT applied."
else
  fail "§5.4 Test A — unexpected response (not empty, not denied, but no private cols either): $RESP_A"
fi

step "Test B — anon SELECT against each sensitive table"
ALL_BLOCKED=true
for tbl in profiles athletes pipelines outreach highlights highlight_videos athlete_milestones school_notes recruiting_activity; do
  R="$(curl -s "$PROJECT_URL/rest/v1/$tbl?select=*&limit=1" -H "apikey: $ANON_KEY")"
  if [ "$R" = "[]" ] || [[ "$R" == *"permission denied"* ]] || [[ "$R" == *"42501"* ]]; then
    echo "  ${GREEN}✓${RESET} $tbl → blocked"
  else
    echo "  ${RED}✗${RESET} $tbl → returned data: $R"
    ALL_BLOCKED=false
  fi
done
if $ALL_BLOCKED; then pass "All 9 sensitive tables blocked for anon"; else fail "§5.4 Test B — one or more sensitive tables readable by anon"; fi

step "Test C — call get_public_athlete_profile RPC and inspect column keys"
cmd "curl -s \"\$PROJECT_URL/rest/v1/rpc/get_public_athlete_profile\" -H \"apikey: \$ANON_KEY\" -H \"Content-Type: application/json\" -d '{\"p_profile_id\":\"\$TARGET_ID\"}'"
RPC_RAW="$(curl -s "$PROJECT_URL/rest/v1/rpc/get_public_athlete_profile" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_profile_id\":\"$TARGET_ID\"}")"
echo "$RPC_RAW" | jq '.[0] // .' 2>/dev/null || echo "$RPC_RAW"

# Pull keys from the first object (RPC returns an array)
KEYS_OUT="$(echo "$RPC_RAW" | jq -r '.[0] | keys[]' 2>/dev/null | sort)"
echo
echo "Returned columns:"
echo "$KEYS_OUT" | sed 's/^/  /'

# Forbidden columns: if any appear, that's a column leak.
FORBIDDEN=(height_cm gpa sat_score act_score weight weight_kg intended_major)
LEAKED_COLS=""
for c in "${FORBIDDEN[@]}"; do
  if grep -qx "$c" <<<"$KEYS_OUT"; then
    LEAKED_COLS="$LEAKED_COLS $c"
  fi
done

if [ -n "$LEAKED_COLS" ]; then
  fail "§5.4 Test C — CRITICAL: RPC leaks private columns:$LEAKED_COLS"
elif [ -z "$KEYS_OUT" ]; then
  fail "§5.4 Test C — RPC returned no data for target ID $TARGET_ID. Either ID is wrong or RPC isn't deployed."
else
  pass "RPC column whitelist is clean — no GPA/SAT/ACT/height/weight/intended_major"
fi

step "Test D — call get_public_athlete_highlights RPC"
cmd "curl -s \"\$PROJECT_URL/rest/v1/rpc/get_public_athlete_highlights\" ..."
HL_RAW="$(curl -s "$PROJECT_URL/rest/v1/rpc/get_public_athlete_highlights" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_athlete_id\":\"$TARGET_ID\"}")"
echo "$HL_RAW" | jq '.[0] // "no clips"' 2>/dev/null || echo "$HL_RAW"

if [[ "$HL_RAW" == "[]" ]] || [[ "$HL_RAW" == *"mux_playback_id"* ]]; then
  # If clips exist, verify no forbidden columns
  HL_KEYS="$(echo "$HL_RAW" | jq -r '.[0] | keys[]' 2>/dev/null)"
  HL_LEAK=""
  for c in storage_path upload_id asset_id error_message created_by_user_id; do
    if grep -qx "$c" <<<"$HL_KEYS"; then HL_LEAK="$HL_LEAK $c"; fi
  done
  if [ -n "$HL_LEAK" ]; then
    fail "§5.4 Test D — highlights RPC leaks internal columns:$HL_LEAK"
  else
    pass "Highlights RPC returns expected shape (or empty)"
  fi
elif [[ "$HL_RAW" == *"permission denied"* ]] || [[ "$HL_RAW" == *"42501"* ]]; then
  fail "§5.4 Test D — anon can't EXECUTE get_public_athlete_highlights: $HL_RAW"
else
  fail "§5.4 Test D — unexpected highlights response: $HL_RAW"
fi

# Cleanup the throwaway athlete if we created one
if [ -n "${TEST_UID:-}" ]; then
  step "Cleanup test athlete"
  psql "$DB_URL" -c "
    delete from athletes where user_id = '$TEST_UID';
    delete from profiles where id = '$TEST_UID';
    delete from auth.users where id = '$TEST_UID';
  " >/dev/null 2>&1
fi

# ── Summary ────────────────────────────────────────────────────────
header "SUMMARY"
echo
echo "${GREEN}Passes: $PASS_COUNT${RESET}"
echo "${RED}Failures: $FAIL_COUNT${RESET}"

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo
  echo "${GREEN}${BOLD}ALL LOCAL VERIFICATIONS PASSED.${RESET}"
  echo
  echo "Next steps:"
  echo "  1. Run sections 6 and 7 manually in Chrome DevTools (browser tests)."
  echo "  2. Once those pass, re-run this script against staging."
  exit 0
else
  echo
  echo "${RED}${BOLD}LOCAL VERIFICATION FAILED.${RESET}"
  echo
  echo "Failed sections:"
  for f in "${FAIL_LIST[@]}"; do
    echo "  - $f"
  done
  echo
  echo "Do NOT proceed to staging until all are green."
  exit 1
fi
