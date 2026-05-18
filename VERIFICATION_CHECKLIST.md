# Migration Verification Checklist — 044 / 046 / 047 / 048

This is a step-by-step manual verification you can execute without
writing any code. Every step lists the EXACT command to run and the
EXACT output to expect. If a step's output doesn't match — STOP and
read the rollback section before applying anything further.

The checklist is designed for three environments, in order:

1. **Local** — Supabase running on your laptop (`supabase start`). Safe
   to break, easy to reset. Run the whole checklist here first.
2. **Staging** — a separate Supabase project with realistic but
   throwaway data. Run the whole checklist here second.
3. **Production** — your live `eastside-fc` Supabase project, with 16
   real minor athletes. Run the read-only verifications here; do NOT
   run the destructive tests (impersonation INSERTs, signup floods,
   etc.) against prod data — use staging for those.

Sections labeled **[DESTRUCTIVE]** create rows, send signups, or
otherwise change data. Only run those locally or against staging.

---

## 0. PREREQUISITES — DO ONCE BEFORE STARTING

### 0.1 — Tools you need installed on your Mac

Open **Terminal** (Applications -> Utilities -> Terminal) and paste
each line, one at a time. Each should print a version number.

```
supabase --version
psql --version
curl --version
jq --version
```

Expected output: a version line for each, like `2.20.5`, `psql (PostgreSQL) 16.4`,
`curl 8.4.0`, `jq-1.7.1`. If any says "command not found":

```
brew install supabase/tap/supabase
brew install libpq          # for psql
brew install jq             # for jq
```

(`curl` ships with macOS.)

### 0.2 — Three sets of credentials

Open a text file (TextEdit -> Format -> Make Plain Text) and fill in
ALL of these. You'll paste them into Terminal commands repeatedly.

**LOCAL** (after running `supabase start` in the repo root, paste the
values from its output):
```
LOCAL_PROJECT_URL=http://127.0.0.1:54321
LOCAL_ANON_KEY=<the "anon key" printed by supabase start>
LOCAL_SERVICE_KEY=<the "service_role key" printed by supabase start>
LOCAL_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**STAGING** (from Supabase Dashboard -> your staging project ->
Settings -> API):
```
STAGING_PROJECT_URL=https://<staging-ref>.supabase.co
STAGING_ANON_KEY=<the "anon public" key on the API page>
STAGING_SERVICE_KEY=<the "service_role secret" key on the API page>
STAGING_DB_URL=<copy from Settings -> Database -> Connection string -> URI>
```

**PRODUCTION** (same place, production project):
```
PROD_PROJECT_URL=https://<prod-ref>.supabase.co
PROD_ANON_KEY=<the "anon public" key>
PROD_SERVICE_KEY=<DO NOT use this for read tests; only for rollbacks>
PROD_DB_URL=<copy from Settings -> Database -> Connection string -> URI>
```

**Security note:** the service_role key bypasses RLS. Never paste it
into a public Slack, a screen-share, or a browser console.

### 0.3 — Load credentials into your shell for the current environment

For each environment you're testing, run ONE of these blocks in
Terminal first. Every command in the checklist uses `$PROJECT_URL`,
`$ANON_KEY`, etc. so you don't need to edit each command.

LOCAL:
```
export PROJECT_URL=http://127.0.0.1:54321
export ANON_KEY=<paste LOCAL_ANON_KEY>
export SERVICE_KEY=<paste LOCAL_SERVICE_KEY>
export DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

STAGING:
```
export PROJECT_URL=https://<staging-ref>.supabase.co
export ANON_KEY=<paste STAGING_ANON_KEY>
export SERVICE_KEY=<paste STAGING_SERVICE_KEY>
export DB_URL=<paste STAGING_DB_URL>
```

PRODUCTION:
```
export PROJECT_URL=https://<prod-ref>.supabase.co
export ANON_KEY=<paste PROD_ANON_KEY>
export SERVICE_KEY=
export DB_URL=<paste PROD_DB_URL>
```

### 0.4 — Sanity check the connection

```
psql "$DB_URL" -c "select current_database(), current_user;"
```

Expected output:
```
 current_database | current_user
------------------+--------------
 postgres         | postgres
(1 row)
```

If you see "FATAL: password authentication failed" — your DB_URL is
wrong. Re-copy from the dashboard.

---

## 1. APPLY MIGRATIONS — LOCAL ONLY (skip for staging/prod sections)

### 1.1 — Reset local DB to a clean migration history

In Terminal, from the repo root:
```
cd /Users/claudiakirtman/krs-v2
supabase db reset
```

Expected output ends with:
```
Applying migration 048_public_profile_rpcs.sql...
Finished supabase db reset on branch main.
```

If any migration fails: STOP, read the error, fix the offending
migration file, then re-run `supabase db reset`.

### 1.2 — Verify all four migrations show as applied

```
psql "$DB_URL" -c "select version, name from supabase_migrations.schema_migrations where version in ('044','045','046','047','048') order by version;"
```

Expected output:
```
 version |                  name
---------+----------------------------------------
 044     | security_hardening_with_check
 045     | public_profile_privacy
 046     | performance_indexes
 047     | atomic_invite_consume
 048     | public_profile_rpcs
(5 rows)
```

(045 is listed because the file exists as a no-op — that's correct.)

---

## 2. MIGRATION 044 — RLS WITH CHECK (IMPERSONATION DEFENSE)

### 2.1 — Confirm WITH CHECK clauses are present

Open Supabase Studio (LOCAL: http://127.0.0.1:54323; STAGING/PROD:
Dashboard -> SQL Editor). Paste:

```sql
select polname, polrelid::regclass as table_name,
       pg_get_expr(polqual,  polrelid) as using_clause,
       pg_get_expr(polwithcheck, polrelid) as with_check_clause
from pg_policy
where polrelid::regclass::text in (
  'profiles','athletes','pipelines','outreach','highlights',
  'highlight_videos','athlete_milestones','school_notes',
  'recruiting_activity','org_members','invite_codes',
  'announcements','id_camps'
)
  and polcmd in ('a','*','w')  -- INSERT or ALL or UPDATE
order by table_name, polname;
```

**Expected:** at least one row per table; every row has a NON-NULL
`with_check_clause`. Specifically, the policies whose `polcmd` is
'a' (INSERT) MUST show a `with_check_clause` value — that's what 044
adds. The clause typically looks like `(auth.uid() = user_id)` or
`(EXISTS ( SELECT 1 FROM org_members ... WHERE org_members.user_id = auth.uid() ...))`.

**Fail signal:** any INSERT policy row where `with_check_clause` is NULL.
That table is impersonation-vulnerable. Note the table name and stop.

### 2.2 — **[DESTRUCTIVE — LOCAL/STAGING ONLY]** Live impersonation attack

This test signs in as User A and tries to INSERT a row claiming to be
User B. With 044 applied, the INSERT must fail.

**Step 1:** Create two test users via Supabase Studio -> Authentication
-> Users -> Add user (do this twice). Note their UUIDs:
- ALICE_ID = `<uuid of alice@test.local>`
- BOB_ID   = `<uuid of bob@test.local>`

Both should have a password you set on creation.

**Step 2:** Sign in as Alice and get her JWT:

```
ALICE_JWT=$(curl -s -X POST "$PROJECT_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.local","password":"<alice-password>"}' \
  | jq -r .access_token)
echo "$ALICE_JWT" | head -c 30; echo "..."
```

Expected: prints the first 30 chars of a JWT (starts with `eyJ`). If
it prints `null...` — the login failed; check the password.

**Step 3:** Alice tries to insert a `pipelines` row claiming to be
Bob (impersonation):

```
curl -s -X POST "$PROJECT_URL/rest/v1/pipelines" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ALICE_JWT" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"athlete_id\":\"$BOB_ID\",\"school_name\":\"Impersonation Test School\",\"stage\":\"interested\"}"
```

**Expected (with 044 applied):**
```
{"code":"42501","details":null,"hint":null,"message":"new row violates row-level security policy for table \"pipelines\""}
```

The HTTP status code is 403. The INSERT is rejected.

**Fail signal:** if you see a JSON object containing `"id":...` (the
row was created), 044 is NOT applied for `pipelines`. Stop and
investigate.

**Step 4:** Repeat step 3 for each table 044 was meant to cover. Just
change the URL path. Tables to test: `pipelines`, `outreach`,
`highlights`, `highlight_videos`, `school_notes`, `recruiting_activity`,
`athlete_milestones`. Each should return code 42501.

**Step 5:** Cleanup. Delete the two test users from Studio ->
Authentication -> Users.

---

## 3. MIGRATION 046 — PERFORMANCE INDEXES

### 3.1 — Confirm all 19 indexes exist

In Studio SQL Editor:
```sql
select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_pipelines_athlete_id',
    'idx_pipelines_athlete_updated',
    'idx_outreach_athlete_id',
    'idx_outreach_athlete_sent_at',
    'idx_recruiting_activity_athlete',
    'idx_highlights_athlete_id',
    'idx_scheduled_camps_athlete',
    'idx_athlete_milestones_user',
    'idx_athlete_milestones_org',
    'idx_profiles_org_role',
    'idx_org_members_user',
    'idx_org_members_org_role',
    'idx_invite_codes_org_active',
    'idx_invite_codes_code',
    'idx_coaches_school',
    'idx_schools_name',
    'idx_school_notes_user_school',
    'idx_announcements_org_created',
    'idx_id_camps_org_date'
  )
order by indexname;
```

**Expected:** 19 rows. If any expected name is missing, that index was
not created — either 046 didn't run, or the table doesn't exist in
this environment yet.

### 3.2 — Confirm a query actually uses an index

```sql
explain analyze
select * from pipelines where athlete_id = '00000000-0000-0000-0000-000000000000';
```

**Expected:** the plan starts with `Index Scan using idx_pipelines_athlete_id`.

**Fail signal:** plan starts with `Seq Scan on pipelines`. The index
exists but the planner isn't using it — possible if the table has < 50
rows (postgres prefers seq scan on tiny tables, which is correct).
Re-run after seeding some pipeline data. If it still seq-scans, run
`analyze pipelines;` to refresh statistics.

---

## 4. MIGRATION 047 — ATOMIC INVITE CONSUMPTION

### 4.1 — Confirm the function exists with the right signature

In Studio SQL Editor:
```sql
select proname,
       pg_get_function_identity_arguments(oid) as args,
       pg_get_function_result(oid) as returns,
       prosecdef as security_definer,
       proconfig as config_settings
from pg_proc
where proname = 'consume_invite_code';
```

**Expected exactly one row:**
```
 proname              | args         | returns                                              | security_definer | config_settings
----------------------+--------------+------------------------------------------------------+------------------+-----------------------
 consume_invite_code  | p_code text  | TABLE(org_id uuid, ok boolean, reason text)          | t                | {search_path=public,pg_temp}
```

**Fail signal:** `security_definer = f` → function runs as caller, will
fail RLS. `config_settings` empty → search_path attack possible.

### 4.2 — Confirm grants are tight

```sql
select grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name = 'consume_invite_code';
```

**Expected:**
```
 grantee      | privilege_type
--------------+----------------
 service_role | EXECUTE
(1 row)
```

**Fail signal:** if `anon` or `authenticated` appears in `grantee`,
they can call the function directly and consume invites without going
through the rate-limited endpoint. Revoke immediately:
```sql
REVOKE EXECUTE ON FUNCTION public.consume_invite_code(text) FROM anon, authenticated;
```

### 4.3 — **[DESTRUCTIVE — LOCAL/STAGING ONLY]** Functional test

**Step 1:** Create a test invite code with `max_uses=2`. In Studio SQL
Editor (note: substitute a real `org_id` from your `organizations`
table):
```sql
insert into invite_codes (code, org_id, max_uses, uses, active)
values ('TESTCODE123',
        (select id from organizations limit 1),
        2, 0, true);
```

**Step 2:** Consume it twice — both should succeed:

```sql
select * from consume_invite_code('TESTCODE123');
select * from consume_invite_code('TESTCODE123');
```

**Expected both times:**
```
                org_id                | ok | reason
--------------------------------------+----+--------
 <some-uuid>                          | t  |
(1 row)
```

**Step 3:** Consume it a third time — should fail with `exhausted`:

```sql
select * from consume_invite_code('TESTCODE123');
```

**Expected:**
```
 org_id | ok | reason
--------+----+-----------
        | f  | exhausted
(1 row)
```

**Step 4:** Try a non-existent code:
```sql
select * from consume_invite_code('DOESNOTEXIST');
```
**Expected:** `ok=f, reason=not_found`.

**Step 5:** Cleanup:
```sql
delete from invite_codes where code = 'TESTCODE123';
```

### 4.4 — **[DESTRUCTIVE — LOCAL/STAGING ONLY]** Concurrency test

This is the test that actually verifies atomicity. We'll fire 10
parallel consumption attempts against a code with `max_uses=3`. Only
3 should succeed.

**Step 1:** Create the test invite:
```sql
insert into invite_codes (code, org_id, max_uses, uses, active)
values ('RACETEST',
        (select id from organizations limit 1),
        3, 0, true);
```

**Step 2:** Save this script as `/tmp/race-test.sh`:

```
#!/bin/bash
psql "$DB_URL" -c "select * from consume_invite_code('RACETEST');" 2>&1 | grep -E '\bt\b|\bf\b' | head -1
```

```
chmod +x /tmp/race-test.sh
```

**Step 3:** Fire 10 in parallel and count successes:

```
for i in {1..10}; do /tmp/race-test.sh & done | wait
echo '---'
psql "$DB_URL" -c "select uses from invite_codes where code='RACETEST';"
```

**Expected:** the `uses` column reads `3` — never higher. (The 10
parallel attempts ran the FOR UPDATE row lock; 3 succeeded, 7 saw
`uses >= max_uses` and returned `exhausted`.)

**Fail signal:** `uses` reads 4 or higher. 047 is not atomic — the
RPC was overwritten by something else, or the lock isn't being taken.

**Step 4:** Cleanup:
```sql
delete from invite_codes where code = 'RACETEST';
```

### 4.5 — **[DESTRUCTIVE — LOCAL/STAGING ONLY]** End-to-end signup flow

Tests that the public-facing /api/admin/validate-invite endpoint
correctly: (a) requires a JWT, (b) rejects bad codes generically,
(c) consumes good codes once, (d) rate-limits.

**Step 1:** Start the local dev server (in a separate Terminal):
```
cd /Users/claudiakirtman/krs-v2 && npm run dev
```
Wait for "Local: http://localhost:5173/".

**Step 2:** Hit the endpoint with NO auth header:
```
curl -i -X POST http://localhost:5173/api/admin/validate-invite \
  -H "Content-Type: application/json" \
  -d '{"inviteCode":"anything"}'
```

**Expected:** `HTTP/1.1 401`, body `{"error":"Missing auth token","opId":"..."}`.

**Step 3:** Create a test user, get their JWT (see 2.2 step 2):
```
TEST_JWT=$(curl -s -X POST "$PROJECT_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@local.test","password":"<password>"}' | jq -r .access_token)
```

**Step 4:** Hit endpoint with invalid code:
```
curl -i -X POST http://localhost:5173/api/admin/validate-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT" \
  -d '{"inviteCode":"NOPE"}'
```
**Expected:** `HTTP/1.1 400`, body `{"error":"Invalid or expired invite code.","opId":"..."}`.

**Step 5:** Create a valid invite, then redeem it:
```sql
-- in Studio:
insert into invite_codes (code, org_id, max_uses, uses, active)
values ('GOODCODE',
        (select id from organizations limit 1),
        1, 0, true);
```
```
curl -i -X POST http://localhost:5173/api/admin/validate-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT" \
  -d '{"inviteCode":"GOODCODE"}'
```
**Expected:** `HTTP/1.1 200`, body `{"success":true,"orgId":"<uuid>"}`.

Confirm the side effects landed:
```sql
select uses from invite_codes where code='GOODCODE';   -- expect 1
select * from profiles where id = '<TEST_USER_ID>';     -- expect role='athlete'
select * from org_members where user_id = '<TEST_USER_ID>'; -- expect role='athlete'
```

**Step 6:** Test rate limit. Fire 5 requests back-to-back:
```
for i in {1..5}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5173/api/admin/validate-invite \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TEST_JWT" \
    -d '{"inviteCode":"WHATEVER"}'
done
```
**Expected output:** `400, 400, 400, 429, 429` (first 3 within limit
even though invalid; 4th+ returns 429 rate-limit).

**Step 7:** Cleanup:
```sql
delete from invite_codes where code='GOODCODE';
delete from org_members where user_id = '<TEST_USER_ID>';
delete from profiles where id = '<TEST_USER_ID>';
```
Then delete the test user in Studio -> Authentication -> Users.

---

## 5. MIGRATION 048 — PUBLIC PROFILE RPCs (PRIVACY)

This is the most important section. We're verifying that anon
**cannot** pull private columns through any path.

### 5.1 — Confirm anon does NOT have SELECT on sensitive tables

In Studio SQL Editor:
```sql
select grantee, table_name
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
```

**Expected (with 048 applied):** **ZERO rows.** Anon has no SELECT
grant on any of these tables.

**Fail signal:** any row in the output means anon can attempt to query
that table directly. 048 didn't run, or a later migration re-granted.

### 5.2 — Confirm the four public-profile RPCs exist and are correctly secured

```sql
select proname,
       pg_get_function_identity_arguments(oid) as args,
       prosecdef as security_definer,
       proconfig as config_settings,
       provolatile as volatility
from pg_proc
where proname in (
  'get_public_athlete_profile',
  'get_public_athlete_highlights',
  'get_public_athlete_primary_highlight',
  'get_public_athlete_milestones'
)
order by proname;
```

**Expected:** exactly 4 rows. Each has `security_definer = t`,
`config_settings = {search_path=public,pg_temp}`, `volatility = s`
(STABLE).

### 5.3 — Confirm grants

```sql
select routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'get_public_athlete_profile',
    'get_public_athlete_highlights',
    'get_public_athlete_primary_highlight',
    'get_public_athlete_milestones'
  )
order by routine_name, grantee;
```

**Expected:** each function has `EXECUTE` granted to `anon` AND
`authenticated`. Nothing for `PUBLIC` (PUBLIC was revoked first).

### 5.4 — **The critical anon-side privacy test**

This is the test the migration was written to pass. We attempt every
way an anonymous attacker might try to read private athlete columns.

First, pick a real athlete UUID from your data so you have a target:
```sql
select id, full_name from profiles where role='athlete' limit 1;
```
Note the UUID — call it `$TARGET_ID`. Substitute it below.

**Test A — Direct anon SELECT on athletes table (the original 045 hole):**
```
curl -s "$PROJECT_URL/rest/v1/athletes?select=*&user_id=eq.$TARGET_ID" \
  -H "apikey: $ANON_KEY"
```
**Expected:** `[]` (empty array, because PostgREST returns empty when
the role has no grant and no policy allows the read). OR an error
like `{"code":"42501",...permission denied for table athletes...}`.

**Fail signal:** if you see a JSON array with one or more objects
containing `gpa`, `sat_score`, `height_cm`, etc., 048 didn't fix the
column leak. Stop the rollout immediately and investigate.

**Test B — Direct anon SELECT on each sensitive table:**

```
for table in profiles athletes pipelines outreach highlights \
             highlight_videos athlete_milestones school_notes \
             recruiting_activity; do
  echo "== $table =="
  curl -s "$PROJECT_URL/rest/v1/$table?select=*&limit=1" -H "apikey: $ANON_KEY"
  echo
done
```

**Expected:** every table returns `[]` or a permission-denied JSON
error. None should return real data.

**Test C — Call the safe RPC and verify the column projection:**
```
curl -s "$PROJECT_URL/rest/v1/rpc/get_public_athlete_profile" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_profile_id\":\"$TARGET_ID\"}" | jq 'keys'
```
**Expected (the allowed columns):**
```
[
  "bio",
  "city",
  "class_year",
  "club_team",
  "dominant_foot",
  "full_name",
  "high_school",
  "highlight_reel_url",
  "hudl_url",
  "id",
  "instagram_url",
  "jersey_number",
  "org_id",
  "org_logo_url",
  "org_name",
  "org_primary_color",
  "org_secondary_color",
  "org_slug",
  "position",
  "profile_photo_url",
  "state",
  "tiktok_url",
  "twitter_url",
  "veo_link_url",
  "youtube_highlights_url",
  "youtube_url"
]
```

**CRITICAL FAIL signal:** if the keys output contains ANY of
`"height_cm"`, `"gpa"`, `"sat_score"`, `"act_score"`, `"weight"`,
`"intended_major"`, `"weight_kg"`, the RPC is returning private
columns. Stop, fix the function body in `048_public_profile_rpcs.sql`,
re-deploy.

**Test D — Call the highlights RPC and verify only ready+ordered clips:**
```
curl -s "$PROJECT_URL/rest/v1/rpc/get_public_athlete_highlights" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_athlete_id\":\"$TARGET_ID\"}" | jq '.[0] // "no clips"'
```
**Expected:** either `"no clips"`, or an object with keys
`id, mux_playback_id, title, start_time, end_time, duration, overlay_name, overlay_position, overlay_jersey, reel_order`.

Verify NO key like `storage_path`, `upload_id`, `asset_id`,
`error_message`, `created_by_user_id` appears.

### 5.5 — Authenticated user still works (regression test)

An authenticated user must still be able to read their own profile via
the normal app code path. Sign in as a real user and:

```
USER_JWT=<see 2.2 step 2 for how to get this>

curl -s "$PROJECT_URL/rest/v1/profiles?select=*&id=eq.$USER_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" | jq '.[0].id'
```
**Expected:** prints the user's UUID (their own profile is readable).

```
curl -s "$PROJECT_URL/rest/v1/athletes?select=*&user_id=eq.$USER_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" | jq '.[0] | {gpa, height_cm}'
```
**Expected:** prints `{"gpa": "<value>", "height_cm": <value>}` —
authenticated users CAN read their own private fields. Only anon can't.

**Fail signal:** if the authenticated user sees `[]` for their own
profile, RLS on profiles/athletes for authenticated is too strict —
the app will break. Investigate the pre-existing authenticated-role
policies.

---

## 6. AUTH / SIGNUP VERIFICATION FLOW

End-to-end browser test that the new signup chain works.

**Step 1:** Make sure the local server is running (`npm run dev` from
section 4.5 step 1).

**Step 2:** In Studio, create one valid invite code:
```sql
insert into invite_codes (code, org_id, max_uses, uses, active, expires_at)
values ('PILOT-TEST-001',
        (select id from organizations where slug='eastside-fc' limit 1),
        1, 0, true, now() + interval '1 day');
```

**Step 3:** Open Chrome -> http://localhost:5173/signup in an
incognito window (so no cached session).

**Step 4:** Open DevTools -> Network tab. Filter to "Fetch/XHR".

**Step 5:** Fill in the signup form:
- Email: `pilot-test-001@local.test`
- Password: `verylongpassword123`
- Invite code: `PILOT-TEST-001`
- Click Sign Up.

**Step 6:** Watch the Network tab. Expect to see, in order:
- `POST /auth/v1/signup` -> 200, returns a user + session
- `POST /api/admin/validate-invite` -> 200, body `{"success":true,"orgId":"..."}`
  - **Request headers must include `Authorization: Bearer eyJ...`**
  - **Request body must be `{"inviteCode":"PILOT-TEST-001"}` — NO userId field**
- A redirect to the dashboard

**Fail signals:**
- Request body contains `"userId":"..."` — frontend wasn't updated to
  rely on JWT-derived identity. Roll forward; check
  `src/hooks/useAuth.jsx` signUp().
- 401 from validate-invite — JWT not being sent.
- 400 from validate-invite saying "Invalid or expired" when the code
  is fresh — code may have been pre-consumed. Re-run step 2.

**Step 7:** Try signing up a second time with the same code in a new
incognito:
- Sign up with email `pilot-test-002@local.test`, same invite.
- **Expected:** signup auth succeeds, validate-invite returns 400
  "Invalid or expired" (because max_uses=1 and the first user already
  consumed it). The user sees a clear error toast.
- The second user's `auth.users` row exists but has no `profiles` or
  `org_members` row. They can't log in to anything useful.

**Step 8:** Cleanup:
```sql
delete from org_members where user_id in (
  select id from auth.users where email like 'pilot-test-00%@local.test'
);
delete from profiles where id in (
  select id from auth.users where email like 'pilot-test-00%@local.test'
);
delete from invite_codes where code='PILOT-TEST-001';
```
Delete the two test users from Studio -> Authentication -> Users.

---

## 7. PUBLIC PROFILE BROWSER TEST

**Step 1:** With the dev server running, open Chrome incognito ->
`http://localhost:5173/p/<TARGET_ID>` (use the UUID from 5.4).

**Step 2:** The page should render with:
- Athlete name + position + grad year
- Club name + logo
- Highlight reel (if any clips exist)
- Bio + high school
- NO GPA, NO SAT, NO ACT, NO height, NO weight, NO target schools

**Step 3:** Open DevTools -> Network -> XHR. Reload. You should see
exactly these calls in the network panel:
- `POST /rest/v1/rpc/get_public_athlete_profile`
- `POST /rest/v1/rpc/get_public_athlete_highlights`
- `POST /rest/v1/rpc/get_public_athlete_primary_highlight`

You should NOT see any of these:
- `GET /rest/v1/athletes?...`
- `GET /rest/v1/profiles?...`
- `GET /rest/v1/highlight_videos?...`
- `GET /rest/v1/organizations?...` (the RPC returns branding inline)

**Step 4:** Click each RPC call -> Response tab. Confirm:
- `get_public_athlete_profile` response contains only the safe column
  list from 5.4 Test C. No `height_cm`, `gpa`, etc.
- `get_public_athlete_highlights` response contains only ready/ordered
  clips with the safe column list from 5.4 Test D.

**Step 5:** Try to read private data from the browser console:
```
await fetch('/rest/v1/athletes?select=gpa,height_cm&limit=1', {
  headers: { apikey: '<paste ANON_KEY>' }
}).then(r => r.json())
```
**Expected:** `[]` or a permission-denied JSON. If you see GPA values:
STOP. 048 did not deploy correctly.

---

## 8. PWA VERIFICATION (browser only)

**Step 1:** Build production artifacts and serve them:
```
cd /Users/claudiakirtman/krs-v2
npm run build && npx vite preview --port 4173
```

**Step 2:** Open Chrome -> `http://localhost:4173/`.

**Step 3:** Open DevTools -> Application tab -> Service Workers.
**Expected:**
- A service worker is registered with source `sw.js`.
- Status: "activated and running".
- The "Update on reload" checkbox is unchecked (default).

**Step 4:** Application -> Manifest. Expected fields:
- Name: KRS College Connect
- Short name: KRS
- Display: standalone
- Theme color: #0a0e1a
- One icon entry with `purpose: any` (no maskable claim — see
  AUDIT_REPORT corrigendum on the manifest).

**Step 5:** Application -> Storage -> Cache Storage. Expected entries:
- `krs-v1-shell` — contains `/`, `/manifest.json`, `/eastside-fc-logo.png`, `/favicon.svg`
- `krs-v1-assets` — populates as you navigate, contains `/assets/index-*.js`, `/assets/vendor-*.js`, CSS, etc.

**Step 6:** Test offline behavior:
- Application -> Service Workers -> check "Offline".
- Reload. The app should still render (cached shell + assets). Data
  requests will fail (network-only for /api/* and Supabase, by
  design); the UI should show "couldn't load" toasts rather than a
  white screen.
- Uncheck "Offline" when done.

**Step 7:** Test the update flow:
- Make a trivial change to any source file.
- `npm run build` again, restart preview.
- Reload the browser tab.
- Application -> Service Workers should show a new "waiting to
  activate" worker briefly, then the page auto-reloads to pick up
  the new bundle. (This is the SKIP_WAITING handler doing its job.)

**Step 8:** Lighthouse audit:
- DevTools -> Lighthouse -> Mobile -> Progressive Web App + Performance + Best Practices.
- Generate report.
- **Expected:** PWA score >= 80, Best Practices >= 90, Performance >= 80.
- Known item that does NOT need to block launch: the install
  promotability section may warn about icon sizes (we use the
  intentionally simple "any" purpose — see AUDIT_REPORT).

---

## 9. PRODUCTION READ-ONLY VERIFICATION

This section is what you run against the live `eastside-fc` Supabase
project. It contains only read-only tests — nothing creates rows,
sends signups, or modifies state. Safe to run any time.

**Step 1:** Export the prod credentials block from section 0.3.

**Step 2:** Run, in order:
- Section 2.1 — confirm WITH CHECK clauses on prod.
- Section 3.1 — confirm 19 indexes on prod.
- Section 4.1 — confirm consume_invite_code exists.
- Section 4.2 — confirm grants are tight (only service_role).
- Section 5.1 — confirm anon does NOT have SELECT on sensitive tables.
- Section 5.2 — confirm the 4 RPCs exist correctly.
- Section 5.3 — confirm RPC grants.
- Section 5.4 Test A, B, C, D — confirm anon can't pull private data
  and the RPCs return only safe columns.

**Step 3:** Once all the above pass, perform the public profile
browser test (section 7) against a real production athlete UUID using
the production URL (e.g., `https://krs.app/p/<real-uuid>`). Verify
the Network tab shows only the three RPC calls.

**Do NOT run on production:**
- Section 2.2 (creates rows)
- Section 4.3, 4.4, 4.5 (creates invite codes, signups)
- Section 6 (creates users)
- Section 8 (changes service worker state for users mid-session if
  done against the prod URL)

---

## 10. ROLLBACK INSTRUCTIONS

If any verification step fails on production and you can't fix
forward immediately, here's how to undo each migration. Always
rollback in REVERSE order (048 first, then 047, etc).

**Before any rollback,** take a logical backup so you can re-replay:
```
pg_dump "$DB_URL" --no-owner --no-privileges --schema-only > /tmp/krs-prod-schema-pre-rollback.sql
pg_dump "$DB_URL" --no-owner --no-privileges --data-only --table=public.invite_codes > /tmp/krs-prod-invites-pre-rollback.sql
```

### 10.1 — Rollback 048 (public profile RPCs)

```sql
DROP FUNCTION IF EXISTS public.get_public_athlete_profile(uuid);
DROP FUNCTION IF EXISTS public.get_public_athlete_highlights(uuid);
DROP FUNCTION IF EXISTS public.get_public_athlete_primary_highlight(uuid);
DROP FUNCTION IF EXISTS public.get_public_athlete_milestones(uuid);

-- Restore anon SELECT grants (this is the "open" state from before 048;
-- only do this if you're rolling back to a state where 045's views were
-- already torn down. Otherwise leave anon without these grants.)
GRANT SELECT ON public.profiles            TO anon;
GRANT SELECT ON public.athletes            TO anon;
GRANT SELECT ON public.highlights          TO anon;
GRANT SELECT ON public.highlight_videos    TO anon;
GRANT SELECT ON public.athlete_milestones  TO anon;
```

**After this rollback, the public profile page WILL BREAK.** It needs
to be reverted on the frontend in lockstep:
```
cd /Users/claudiakirtman/krs-v2
git revert <commit-that-introduced-the-rpc-calls>
git push origin main
```
Wait for Vercel to redeploy before unrolling further.

### 10.2 — Rollback 047 (atomic invite consume)

```sql
DROP FUNCTION IF EXISTS public.consume_invite_code(text);
```

The Vercel endpoint `/api/admin/validate-invite` calls this function;
without it, signup will 500. Revert the endpoint to its pre-047 state
on the frontend before dropping the function:
```
git revert <commit-that-introduced-validate-invite-rewrite>
git push origin main
```
Wait for Vercel redeploy, then drop the function.

### 10.3 — Rollback 046 (indexes)

Safe to drop without frontend coordination — only affects performance,
never correctness.
```sql
DROP INDEX IF EXISTS idx_pipelines_athlete_id;
DROP INDEX IF EXISTS idx_pipelines_athlete_updated;
DROP INDEX IF EXISTS idx_outreach_athlete_id;
DROP INDEX IF EXISTS idx_outreach_athlete_sent_at;
DROP INDEX IF EXISTS idx_recruiting_activity_athlete;
DROP INDEX IF EXISTS idx_highlights_athlete_id;
DROP INDEX IF EXISTS idx_scheduled_camps_athlete;
DROP INDEX IF EXISTS idx_athlete_milestones_user;
DROP INDEX IF EXISTS idx_athlete_milestones_org;
DROP INDEX IF EXISTS idx_profiles_org_role;
DROP INDEX IF EXISTS idx_org_members_user;
DROP INDEX IF EXISTS idx_org_members_org_role;
DROP INDEX IF EXISTS idx_invite_codes_org_active;
DROP INDEX IF EXISTS idx_invite_codes_code;
DROP INDEX IF EXISTS idx_coaches_school;
DROP INDEX IF EXISTS idx_schools_name;
DROP INDEX IF EXISTS idx_school_notes_user_school;
DROP INDEX IF EXISTS idx_announcements_org_created;
DROP INDEX IF EXISTS idx_id_camps_org_date;
```

### 10.4 — Rollback 044 (WITH CHECK)

Dropping the WITH CHECK clauses re-opens the impersonation hole. Only
do this if 044's WITH CHECK is causing legitimate writes to fail and
you need to triage in production. For each policy, you re-create it
without the WITH CHECK by ALTERing in place. Example for
`pipelines` insert policy (the exact policy names live in 044):

```sql
ALTER POLICY "Athletes can insert their own pipelines"
  ON pipelines
  WITH CHECK (true);  -- TEMPORARY ONLY; restore the proper clause ASAP
```

**Do NOT leave this state in production for more than a few hours.**
Anyone with a valid JWT can impersonate any other user during this
window. If you must rollback 044, immediately apply temporary
application-level checks before re-enabling signup.

### 10.5 — Restoring from logical backup

If something has corrupted data and you need to restore:
```
psql "$DB_URL" < /tmp/krs-prod-schema-pre-rollback.sql
psql "$DB_URL" < /tmp/krs-prod-invites-pre-rollback.sql
```

For full data restore, use Supabase Dashboard -> Database -> Backups
and pick a point-in-time. PITR is enabled on Pro projects by default.

---

## 11. SIGN-OFF SHEET

Print/copy this checklist for each environment. Initial each line
only after the corresponding section passes.

| # | Section | Local | Staging | Production |
|---|---|---|---|---|
| 1 | 1.2 — Migrations 044-048 applied | __ | __ | __ |
| 2 | 2.1 — WITH CHECK clauses present | __ | __ | __ |
| 3 | 2.2 — Impersonation INSERT rejected | __ | __ | N/A |
| 4 | 3.1 — All 19 indexes exist | __ | __ | __ |
| 5 | 4.1 — consume_invite_code exists | __ | __ | __ |
| 6 | 4.2 — Function grants tight | __ | __ | __ |
| 7 | 4.3 — Sequential consume tests pass | __ | __ | N/A |
| 8 | 4.4 — Concurrent race test caps at max_uses | __ | __ | N/A |
| 9 | 4.5 — End-to-end signup endpoint behaves | __ | __ | N/A |
| 10 | 5.1 — Anon has no SELECT on sensitive tables | __ | __ | __ |
| 11 | 5.2 — Four public RPCs exist | __ | __ | __ |
| 12 | 5.3 — RPC grants correct | __ | __ | __ |
| 13 | 5.4 Test A — Direct anon SELECT blocked | __ | __ | __ |
| 14 | 5.4 Test C — RPC keys = safe column list (no GPA/SAT/height) | __ | __ | __ |
| 15 | 5.5 — Authenticated user can still read own data | __ | __ | __ |
| 16 | 6 — Browser signup flow end-to-end | __ | __ | N/A |
| 17 | 7 — Public profile browser test | __ | __ | __ |
| 18 | 8 — PWA service worker + manifest + offline | __ | __ | __ |
| 19 | 9 — Production read-only sweep | N/A | N/A | __ |

A "Production" cell is N/A when the test is destructive. Only proceed
to pilot once every non-N/A cell has initials.
