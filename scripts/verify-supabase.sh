#!/usr/bin/env bash
#
# verify-supabase.sh — runs the verification suite against ANY
# Supabase project (local, staging, or production read-only).
#
# Usage A — local (auto-detects from supabase CLI):
#   bash scripts/verify-supabase.sh
#
# Usage B — staging/production (set env vars first):
#   export PROJECT_URL=https://<ref>.supabase.co
#   export ANON_KEY=<anon public key>
#   export SERVICE_KEY=<service_role key>   # only needed for destructive tests
#   export DB_URL=<postgres connection string>
#   export MODE=staging                     # or 'production-readonly'
#   bash scripts/verify-supabase.sh
#
# MODE controls which tests run:
#   - 'local' (default if supabase CLI is up): all tests, including
#     destructive (impersonation INSERTs, race test, signup flood).
#   - 'staging': all tests including destructive — staging is throwaway.
#   - 'production-readonly': skips destructive tests (no impersonation,
#     no test invite codes, no test users created).

set -u

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

step()  { echo; echo "${BOLD}▶ $1${RESET}"; }
cmd()   { echo "${YELLOW}\$ $*${RESET}"; }
pass()  { echo "${GREEN}✓ PASS — $1${RESET}"; PASS_COUNT=$((PASS_COUNT+1)); }
fail()  { echo "${RED}✗ FAIL — $1${RESET}"; FAIL_COUNT=$((FAIL_COUNT+1)); FAIL_LIST+=("$1"); }
skip()  { echo "${YELLOW}⊘ SKIP — $1${RESET}"; }

# ── Detect environment ─────────────────────────────────────────────
header "Environment detection"

for tool in psql jq curl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "${RED}MISSING TOOL: $tool${RESET}"
    echo "Install: brew install libpq (for psql), brew install jq"
    exit 2
  fi
done

MODE="${MODE:-}"

if [ -z "${PROJECT_URL:-}" ]; then
  # Try local supabase CLI
  if command -v supabase >/dev/null 2>&1 && supabase status >/dev/null 2>&1; then
    DB_URL="$(supabase status -o env 2>/dev/null | awk -F= '/^DB_URL=/{print $2}' | tr -d '"')"
    PROJECT_URL="$(supabase status -o env 2>/dev/null | awk -F= '/^API_URL=/{print $2}' | tr -d '"')"
    ANON_KEY="$(supabase status -o env 2>/dev/null | awk -F= '/^ANON_KEY=/{print $2}' | tr -d '"')"
    SERVICE_KEY="$(supabase status -o env 2>/dev/null | awk -F= '/^SERVICE_ROLE_KEY=/{print $2}' | tr -d '"')"
    if [ -z "$DB_URL" ]; then
      DB_URL="$(supabase status 2>/dev/null | awk '/DB URL/{print $NF}')"
      PROJECT_URL="$(supabase status 2>/dev/null | awk '/API URL/{print $NF}')"
      ANON_KEY="$(supabase status 2>/dev/null | awk '/anon key/{print $NF}')"
      SERVICE_KEY="$(supabase status 2>/dev/null | awk '/service_role key/{print $NF}')"
    fi
    MODE="${MODE:-local}"
  else
    echo "${RED}PROJECT_URL is not set and no local supabase is running.${RESET}"
    echo "Either:"
    echo "  (1) Run 'supabase start' in this repo, then re-run this script."
    echo "  (2) Or export PROJECT_URL, ANON_KEY, SERVICE_KEY, DB_URL, MODE first."
    exit 2
  fi
fi

MODE="${MODE:-staging}"

case "$MODE" in
  local|staging) DESTRUCTIVE=true ;;
  production-readonly) DESTRUCTIVE=false ;;
  *)
    echo "${RED}Unknown MODE='$MODE'. Use local, staging, or production-readonly.${RESET}"
    exit 2
    ;;
esac

echo "MODE        = $MODE"
echo "PROJECT_URL = $PROJECT_URL"
echo "DB_URL      = $(echo "$DB_URL" | sed 's|:[^@]*@|:****@|')"
echo "ANON_KEY    = ${ANON_KEY:0:30}..."
echo "Destructive tests: $($DESTRUCTIVE && echo enabled || echo SKIPPED)"

# Verify DB connection
if ! psql "$DB_URL" -c "select 1;" >/dev/null 2>&1; then
  echo "${RED}Cannot connect to DB_URL.${RESET}"
  echo "Try: psql \"\$DB_URL\" -c \"select 1;\""
  exit 2
fi

# Verify REST connection
if ! curl -sf "$PROJECT_URL/rest/v1/" -H "apikey: $ANON_KEY" >/dev/null 2>&1; then
  echo "${YELLOW}Warning: PROJECT_URL/rest/v1 didn't return 200; continuing anyway.${RESET}"
fi

# ── §1.2 — migrations applied ──────────────────────────────────────
header "§1.2 — Confirm migrations 044–048 applied"

cmd "psql \"\$DB_URL\" -c \"select version, name from supabase_migrations.schema_migrations where version in ('044','045','046','047','048');\""

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
  fail "§1.2 — one or more migrations not applied"
fi

# ── §2.1 — WITH CHECK clauses ──────────────────────────────────────
header "§2.1 — Confirm WITH CHECK clauses on INSERT/UPDATE policies"

MISSING="$(psql "$DB_URL" -At -F'|' -c "
  select polname || ' on ' || polrelid::regclass::text
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

if [ -z "$MISSING" ]; then
  pass "Every INSERT/UPDATE policy on the 13 audited tables has a WITH CHECK clause"
else
  echo "${RED}Policies missing WITH CHECK:${RESET}"
  echo "$MISSING"
  fail "§2.1 — migration 044 not fully applied"
fi

# ── §4.1 — consume_invite_code metadata + grants ───────────────────
header "§4.1 — Confirm consume_invite_code RPC"

FN_META="$(psql "$DB_URL" -At -F'|' -c "
  select proname, pg_get_function_identity_arguments(oid),
         pg_get_function_result(oid), prosecdef,
         coalesce(array_to_string(proconfig, ','), '')
  from pg_proc where proname = 'consume_invite_code';
" 2>&1)"

echo "$FN_META"

if [ -z "$FN_META" ]; then
  fail "§4.1 — consume_invite_code does not exist (migration 047 not applied)"
else
  IS_SECDEF="$(echo "$FN_META" | cut -d'|' -f4)"
  CFG="$(echo "$FN_META" | cut -d'|' -f5)"
  if [ "$IS_SECDEF" = "t" ] && [[ "$CFG" == *"search_path=public, pg_temp"* || "$CFG" == *"search_path=public,pg_temp"* ]]; then
    pass "SECURITY DEFINER with locked search_path"
  else
    fail "§4.1 — wrong security flags: secdef=$IS_SECDEF config=$CFG"
  fi
fi

GRANTS="$(psql "$DB_URL" -At -F'|' -c "
  select grantee, privilege_type
  from information_schema.role_routine_grants
  where routine_schema='public' and routine_name='consume_invite_code'
  order by grantee;" 2>&1)"
echo "$GRANTS"

BAD="$(echo "$GRANTS" | grep -E '^(anon|authenticated|public)\|' || true)"
if [ -z "$BAD" ] && grep -q '^service_role|EXECUTE$' <<<"$GRANTS"; then
  pass "EXECUTE restricted to service_role only"
else
  fail "§4.1 — wrong grants: $GRANTS"
fi

# ── §5.1 — anon SELECT revoked ─────────────────────────────────────
header "§5.1 — Confirm anon has NO SELECT on sensitive tables"

LEAKED="$(psql "$DB_URL" -At -F'|' -c "
  select table_name
  from information_schema.role_table_grants
  where grantee='anon' and table_schema='public'
    and privilege_type='SELECT'
    and table_name in (
      'profiles','athletes','pipelines','outreach','highlights',
      'highlight_videos','athlete_milestones','school_notes',
      'recruiting_activity','scheduled_camps','camp_expenses'
    )
  order by table_name;" 2>&1)"

if [ -z "$LEAKED" ]; then
  pass "Anon has zero SELECT grants on the 11 sensitive tables"
else
  echo "${RED}LEAKED:${RESET}"
  echo "$LEAKED"
  fail "§5.1 — anon has SELECT on: $LEAKED"
fi

# ── §5.4 A/B — direct anon SELECT attack ───────────────────────────
header "§5.4 — Anon attack + RPC column whitelist"

# Helper: capture ONLY the UUID from a SELECT, never psql command tags
# or stderr noise. Uses -At -q (tuples-only, unaligned, quiet — silences
# the "INSERT 0 1"-style status footer), routes stderr to /dev/null so
# any NOTICE/WARNING can't sneak in, and runs the value through a strict
# UUID regex via awk for belt-and-suspenders. Returns empty if no match.
psql_uuid() {
  local sql="$1"
  psql "$DB_URL" -At -q -c "$sql" 2>/dev/null \
    | awk 'BEGIN{IGNORECASE=1} /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/ { print; exit }'
}

# Find a target athlete UUID (read-only)
TARGET_ID="$(psql_uuid "
  select p.id from profiles p
  join athletes a on a.user_id = p.id
  where p.role='athlete' limit 1;")"

if [ -z "$TARGET_ID" ]; then
  if $DESTRUCTIVE; then
    echo "${YELLOW}No athletes in DB. Creating throwaway test athlete with sensitive fields populated...${RESET}"
    ORG_ID="$(psql_uuid "select id from organizations limit 1;")"
    if [ -z "$ORG_ID" ]; then
      ORG_ID="$(psql_uuid "insert into organizations (name, slug)
                           values ('Verify Test Org', 'verify-test-org-$RANDOM')
                           returning id;")"
    fi
    # Generate UUID in a pure SELECT (no INSERT tag to leak), then use
    # it explicitly in the INSERT (which we fully silence). This way
    # TEST_UID is guaranteed to be exactly one UUID and nothing else.
    TEST_UID="$(psql_uuid "select gen_random_uuid();")"
    psql "$DB_URL" -q -c "
      insert into auth.users (id, email)
      values ('$TEST_UID', 'verify-athlete-$RANDOM@local.test');
      insert into profiles (id, full_name, role, org_id)
      values ('$TEST_UID', 'Verify Athlete', 'athlete', '$ORG_ID')
      on conflict (id) do nothing;
      insert into athletes (user_id, position, class_year, gpa, sat_score, act_score, height_cm, weight_kg, intended_major)
      values ('$TEST_UID', 'Forward', 2027, '3.95', 1450, 32, 168, 60, 'Computer Science')
      on conflict (user_id) do nothing;
    " >/dev/null 2>&1
    TARGET_ID="$TEST_UID"
  else
    skip "§5.4 — no athlete in DB and destructive tests disabled; skipping"
    TARGET_ID=""
  fi
fi

# Hard guard: anything other than a single canonical UUID is a bug;
# refuse to send it into a URL or JSON body.
if [ -n "$TARGET_ID" ] && ! [[ "$TARGET_ID" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
  echo "${RED}TARGET_ID is not a clean UUID — bailing on §5.4. Raw value: '${TARGET_ID}'${RESET}"
  TARGET_ID=""
  fail "§5.4 — TARGET_ID capture polluted by extra output"
fi

if [ -n "$TARGET_ID" ]; then
  echo "TARGET_ID=$TARGET_ID"

  # Helper: do a curl + capture both HTTP status AND response body.
  # Prints "<status>|<body>" so the caller can split on the first '|'.
  # Avoids the previous bug where an empty 401 body was indistinguishable
  # from a 200 with no rows. Also classifies anything in 2xx with private
  # column names as a CRITICAL leak.
  http_probe() {
    local url="$1" extra_args=("${@:2}")
    # -w '\n%{http_code}' appends the status on its own line after body
    local out status body
    out="$(curl -sS -w '\n%{http_code}' "$url" "${extra_args[@]}" 2>&1)" || true
    status="$(printf '%s\n' "$out" | tail -n1)"
    body="$(printf '%s\n' "$out" | sed '$d')"
    printf '%s|%s' "$status" "$body"
  }

  # Classify a probe response. Echoes: blocked | leaked | unexpected
  classify_anon_response() {
    local status="$1" body="$2"
    # 401/403/404 with anything in the body — blocked.
    case "$status" in
      401|403|404) echo blocked; return ;;
    esac
    # 2xx with empty body or [] — blocked (PostgREST returns [] when
    # role has SELECT grant but RLS filters out all rows, or returns
    # empty body when grant is missing depending on version).
    if [ -z "$body" ] || [ "$body" = "[]" ]; then echo blocked; return; fi
    # 2xx with permission-denied error JSON.
    if [[ "$body" == *"permission denied"* ]] || [[ "$body" == *"42501"* ]]; then
      echo blocked; return
    fi
    # 2xx with private column names — CRITICAL leak.
    if [[ "$body" == *"\"gpa\""* ]] || [[ "$body" == *"\"height_cm\""* ]] || \
       [[ "$body" == *"\"sat_score\""* ]] || [[ "$body" == *"\"act_score\""* ]] || \
       [[ "$body" == *"\"weight_kg\""* ]] || [[ "$body" == *"\"intended_major\""* ]]; then
      echo leaked; return
    fi
    echo unexpected
  }

  step "Test A — anon direct SELECT * on athletes"
  PROBE_A="$(http_probe "$PROJECT_URL/rest/v1/athletes?select=*&user_id=eq.$TARGET_ID" -H "apikey: $ANON_KEY")"
  STATUS_A="${PROBE_A%%|*}"; BODY_A="${PROBE_A#*|}"
  echo "  HTTP $STATUS_A"
  echo "  body: ${BODY_A:-(empty)}"
  CLASS_A="$(classify_anon_response "$STATUS_A" "$BODY_A")"
  case "$CLASS_A" in
    blocked)   pass "Anon direct SELECT on athletes is blocked (HTTP $STATUS_A)" ;;
    leaked)    fail "§5.4 A — CRITICAL: anon CAN read GPA/height/SAT (HTTP $STATUS_A body $BODY_A)" ;;
    *)         fail "§5.4 A — unexpected response (HTTP $STATUS_A body ${BODY_A:-empty})" ;;
  esac

  step "Test B — anon SELECT against each sensitive table"
  ALL_BLOCKED=true
  for tbl in profiles athletes pipelines outreach highlights highlight_videos athlete_milestones school_notes recruiting_activity; do
    PROBE="$(http_probe "$PROJECT_URL/rest/v1/$tbl?select=*&limit=1" -H "apikey: $ANON_KEY")"
    STATUS="${PROBE%%|*}"; BODY="${PROBE#*|}"
    CLASS="$(classify_anon_response "$STATUS" "$BODY")"
    case "$CLASS" in
      blocked) echo "  ${GREEN}✓${RESET} $tbl  blocked  (HTTP $STATUS)" ;;
      leaked)  echo "  ${RED}✗${RESET} $tbl  LEAKED   (HTTP $STATUS body $BODY)"; ALL_BLOCKED=false ;;
      *)       echo "  ${RED}✗${RESET} $tbl  unexpected (HTTP $STATUS body $BODY)"; ALL_BLOCKED=false ;;
    esac
  done
  $ALL_BLOCKED && pass "All 9 sensitive tables blocked for anon" || fail "§5.4 B — one or more tables not blocked"

  # Build JSON body with printf (zero shell escape interpretation issues)
  # and feed via --data-binary @- so curl reads the body verbatim from
  # stdin. Add Accept header — PostgREST 13 in some Supabase configs
  # rejects RPC POSTs without it.
  step "Test C — RPC get_public_athlete_profile column whitelist"
  RPC_C_BODY="$(printf '{"p_profile_id":"%s"}' "$TARGET_ID")"
  echo "  request body: $RPC_C_BODY"
  PROBE_C="$(printf '%s' "$RPC_C_BODY" | curl -sS -w '\n%{http_code}' \
    -X POST "$PROJECT_URL/rest/v1/rpc/get_public_athlete_profile" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    --data-binary @-)"
  STATUS_C="$(printf '%s\n' "$PROBE_C" | tail -n1)"
  RPC_RAW="$(printf '%s\n' "$PROBE_C" | sed '$d')"
  echo "  HTTP $STATUS_C"
  echo "$RPC_RAW" | jq '.[0] // .' 2>/dev/null || echo "$RPC_RAW"

  KEYS="$(echo "$RPC_RAW" | jq -r '.[0] | keys[]' 2>/dev/null | sort)"
  echo "Returned columns:"; echo "$KEYS" | sed 's/^/  /'

  FORBIDDEN=(height_cm gpa sat_score act_score weight weight_kg intended_major)
  LEAK=""
  for c in "${FORBIDDEN[@]}"; do
    grep -qx "$c" <<<"$KEYS" && LEAK="$LEAK $c"
  done

  if [ -n "$LEAK" ]; then
    fail "§5.4 C — CRITICAL: RPC leaks:$LEAK"
  elif [ -z "$KEYS" ]; then
    fail "§5.4 C — RPC returned no data for $TARGET_ID"
  else
    pass "RPC column whitelist clean — no GPA/SAT/ACT/height/weight/major"
  fi

  step "Test D — RPC get_public_athlete_highlights"
  RPC_D_BODY="$(printf '{"p_athlete_id":"%s"}' "$TARGET_ID")"
  echo "  request body: $RPC_D_BODY"
  PROBE_D="$(printf '%s' "$RPC_D_BODY" | curl -sS -w '\n%{http_code}' \
    -X POST "$PROJECT_URL/rest/v1/rpc/get_public_athlete_highlights" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    --data-binary @-)"
  STATUS_D="$(printf '%s\n' "$PROBE_D" | tail -n1)"
  HL="$(printf '%s\n' "$PROBE_D" | sed '$d')"
  echo "  HTTP $STATUS_D"
  echo "$HL" | jq '.[0] // "no clips"' 2>/dev/null || echo "$HL"

  if [[ "$STATUS_D" == "200" ]] && [[ "$HL" == "[]" || "$HL" == *"mux_playback_id"* ]]; then
    pass "Highlights RPC returns expected shape (or empty)"
  else
    fail "§5.4 D — unexpected (HTTP $STATUS_D body $HL)"
  fi
fi

# ── §4.3/4.4 — Destructive: sequential + race ──────────────────────
if $DESTRUCTIVE; then
  header "§4.3 — Sequential consume tests (DESTRUCTIVE)"

  ORG_ID="$(psql "$DB_URL" -At -c "select id from organizations limit 1;" 2>/dev/null)"
  if [ -z "$ORG_ID" ]; then
    ORG_ID="$(psql "$DB_URL" -At -c "insert into organizations (name, slug) values ('Verify Test Org', 'verify-test-org-$RANDOM') returning id;")"
  fi

  psql "$DB_URL" -c "delete from invite_codes where code in ('VERIFY-SEQ','VERIFY-RACE');" >/dev/null 2>&1
  psql "$DB_URL" -c "insert into invite_codes (code, org_id, max_uses, uses, active) values ('VERIFY-SEQ', '$ORG_ID', 2, 0, true);" >/dev/null

  R1="$(psql "$DB_URL" -At -F'|' -c "select * from consume_invite_code('VERIFY-SEQ');")"
  R2="$(psql "$DB_URL" -At -F'|' -c "select * from consume_invite_code('VERIFY-SEQ');")"
  R3="$(psql "$DB_URL" -At -F'|' -c "select * from consume_invite_code('VERIFY-SEQ');")"
  R4="$(psql "$DB_URL" -At -F'|' -c "select * from consume_invite_code('DOESNTEXIST-$RANDOM');")"

  echo "consume 1: $R1"; echo "consume 2: $R2"; echo "consume 3: $R3"; echo "bad code: $R4"

  if [[ "$R1" == *"|t|"* && "$R2" == *"|t|"* && "$R3" == *"|f|exhausted" && "$R4" == *"|f|not_found" ]]; then
    pass "Sequential consume sequence correct: t, t, f/exhausted, f/not_found"
  else
    fail "§4.3 — sequential consume wrong: see output above"
  fi

  header "§4.4 — Concurrent race (10 parallel vs max_uses=3)"

  psql "$DB_URL" -c "insert into invite_codes (code, org_id, max_uses, uses, active) values ('VERIFY-RACE', '$ORG_ID', 3, 0, true);" >/dev/null

  TMPF="$(mktemp)"
  for i in 1 2 3 4 5 6 7 8 9 10; do
    (psql "$DB_URL" -At -c "select ok from consume_invite_code('VERIFY-RACE');" 2>/dev/null >> "$TMPF") &
  done
  wait

  T_COUNT="$(grep -c '^t$' "$TMPF" 2>/dev/null || echo 0)"
  F_COUNT="$(grep -c '^f$' "$TMPF" 2>/dev/null || echo 0)"
  rm -f "$TMPF"

  FINAL_USES="$(psql "$DB_URL" -At -c "select uses from invite_codes where code='VERIFY-RACE';")"
  echo "Successes: $T_COUNT  Failures: $F_COUNT  Final uses: $FINAL_USES"

  if [ "$T_COUNT" = "3" ] && [ "$FINAL_USES" = "3" ]; then
    pass "Race test: exactly 3 successes, uses=3 (FOR UPDATE row lock works)"
  else
    fail "§4.4 — expected 3 successes + uses=3; got $T_COUNT successes, uses=$FINAL_USES"
  fi

  # Cleanup destructive artifacts
  psql "$DB_URL" -c "delete from invite_codes where code in ('VERIFY-SEQ','VERIFY-RACE');" >/dev/null
  if [ -n "${TEST_UID:-}" ]; then
    psql "$DB_URL" -c "delete from athletes where user_id='$TEST_UID'; delete from profiles where id='$TEST_UID'; delete from auth.users where id='$TEST_UID';" >/dev/null 2>&1
  fi
else
  header "§4.3 / §4.4 — Destructive tests SKIPPED in production-readonly mode"
  skip "Sequential + race consume tests (would create test invite codes)"
fi

# ── Summary ────────────────────────────────────────────────────────
header "SUMMARY"
echo
echo "MODE=$MODE"
echo "${GREEN}Passes: $PASS_COUNT${RESET}"
echo "${RED}Failures: $FAIL_COUNT${RESET}"

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo
  echo "${GREEN}${BOLD}ALL VERIFICATIONS PASSED for MODE=$MODE.${RESET}"
  exit 0
else
  echo
  echo "${RED}${BOLD}VERIFICATION FAILED for MODE=$MODE.${RESET}"
  echo "Failed sections:"
  for f in "${FAIL_LIST[@]}"; do echo "  - $f"; done
  exit 1
fi
