# KRS College Connect — Launch-Blocking Audit Report

**Audit date:** May 17, 2026
**Auditor scope:** senior full-stack engineer + security auditor, 5 sequential phases + corrigendum
**Pilot context:** Eastside FC Washington, 16 ECNL girls' soccer athletes (ages 13-18, all minors) + 1 admin
**Final verification:** ESLint 0 problems, presecure exit 0, `vite build` succeeds in 1.06s

---

## ⚠️  CORRIGENDUM — Migration 045 superseded by 048

The original Phase 2 included migration 045_public_profile_privacy.sql, which used SECURITY INVOKER views over the base tables and added `USING (true)` SELECT policies on profiles/athletes/highlights/athlete_milestones to make those views resolve for anon. **That was wrong** — RLS only filters rows, not columns. An anon caller could simply call `from('athletes').select('*').eq('user_id', X)` and bypass the view entirely, pulling every column including GPA, SAT, ACT, height, weight, intended_major.

**Replacement:** 048_public_profile_rpcs.sql
- Drops the four `USING (true)` policies from 045
- Drops both SECURITY INVOKER views from 045
- Revokes direct anon SELECT on profiles, athletes, pipelines, outreach, highlights, highlight_videos, athlete_milestones, school_notes, recruiting_activity (+ best-effort scheduled_camps, camp_expenses)
- Creates four SECURITY DEFINER RPC functions that explicitly enumerate the safe column projection:
  - `get_public_athlete_profile(p_profile_id uuid)` — profile + joined org branding (height_cm intentionally absent)
  - `get_public_athlete_highlights(p_athlete_id uuid)` — Mux clips, status='ready' AND reel_order>0 only
  - `get_public_athlete_primary_highlight(p_athlete_id uuid)` — legacy YouTube/Hudl fallback
  - `get_public_athlete_milestones(p_athlete_id uuid)` — milestone_id + earned_at only
- `EXECUTE` granted only to anon + authenticated; `REVOKE ALL FROM PUBLIC` first

**Why this cannot leak private data:** anon has no direct SELECT grant on the sensitive base tables, so `from('athletes')` returns 401 from PostgREST. The only anon-readable paths to athlete data are the four RPCs, each of which lists its safe column projection in its function body. Height, GPA, SAT, ACT, weight, intended major, pipeline strategy, outreach history, school notes, recruiting activity — none appear in any function body. Adding them would require an explicit code change to 048. `search_path` is locked to `public, pg_temp` so a schema-shim attack can't intercept the table references.

**Frontend update:** `src/pages/PublicAthleteProfile.jsx` now calls the three RPCs in parallel via `Promise.all([rpc, rpc, rpc])` instead of querying the four base tables. Height display removed from the hero subtitle (only foot + high school shown).

**Status of 045:** rewritten to a `DO $$ NOTICE $$` no-op with a header explaining it's superseded by 048, so a fresh `supabase db reset` produces the same end state as a partial-history environment.

---

## Phase 1 — Database / RLS audit (10 findings)

Live Supabase Postgres + extensive RLS. Audit found and fixed:

| # | Finding | Fix |
|---|---|---|
| 1 | Every INSERT policy across 13 tables had no `WITH CHECK` clause -> authenticated users could INSERT rows pretending to be other users (impersonation) | Migration 044_security_hardening_with_check.sql adds WITH CHECK to 20+ INSERT/UPDATE policies |
| 2 | Public /p/{id} profile leaked GPA, SAT, ACT, weight, height, intended major, full pipeline strategy, and every earned milestone of minor athletes to anonymous visitors | Initially migration 045 (broken — see corrigendum). Now migration 048_public_profile_rpcs.sql: SECURITY DEFINER RPCs + anon SELECT revoked on sensitive base tables |
| 3 | Indexes missing on every FK column hit on hot pages | Migration 046_performance_indexes.sql -- 19 covering indexes |
| 4 | 2 tables referenced in code (highlight_videos, org_nil_deals) missing from live DB | Migrations 042/043 applied via Supabase MCP |
| 5-9 | 5 local migration files missing for already-applied live migrations (036, 037, 038, 040, 041) | Backfilled local SQL files matching live state |
| 10 | Front-end public profile queried raw athletes.select('*') | Now calls SECURITY DEFINER RPCs (post-corrigendum) |

---

## Phase 2 — Security hardening

### Invite endpoint rewrite (api/admin/validate-invite.js)

Old endpoint trusted a client-supplied userId in the request body. Anyone calling the endpoint could create profile + org_member rows for any user ID.

New endpoint:
1. **JWT-based user identity** — userId pulled from supabase.auth.getUser(accessToken) after verifying Authorization: Bearer header.
2. **Atomic invite consumption** via new consume_invite_code(p_code) SECURITY DEFINER RPC (migration 047). Uses SELECT ... FOR UPDATE row lock so concurrent signups cannot bypass max_uses.
3. **Generic error messages** — "Invalid or expired invite code." for not-found / expired / exhausted / rate-limited. Internal reason logged server-side with per-request opId.
4. **Per-IP token-bucket rate limit** — 3 requests per IP per minute (in-memory; documented Upstash swap path).
5. **Orphan-auth protection** — invite use released if org_members write fails after consumption.

### XSS audit

Three dangerouslySetInnerHTML sites cleaned: Outreach.jsx subject preview, Outreach.jsx body preview, VideoStudio.jsx statBox SVG interpolation. Card download-as-PNG path was already safe (browsers run SVG in image-mode).

### Public profile privacy

See corrigendum above. Final state: migration 048 with SECURITY DEFINER RPCs and revoked anon grants.

---

## Phase 3 — Build + lint

Drove `npm run lint` from **129 problems -> 0** (verified with --report-unused-disable-directives).

Most invasive refactors:
- **react-refresh/only-export-components splits** — extracted AuthContext + useAuth to src/hooks/authContext.js; extracted ThemeContext + useTheme to src/contexts/themeContext.js. Updated ~25 import sites.
- **react-hooks/rules-of-hooks (25 errors in VideoStudio.jsx)** — split into outer feature-flag gate + VideoStudioInner so hooks only run when the Mux flag is on.
- **react-hooks/immutability (21 errors across 15 files)** — converted `const loadX = async () => {...}` declared after its useEffect into useCallbacks hoisted above the effect.
- **react-hooks/static-components** — hoisted StatCard, MobileSchoolCard/MobileStageView/StageModal, timeAgoShort to module scope.
- **react-hooks/set-state-in-effect** — refactored 4 cases to derived useMemo; per-line eslint-disable with justification on remaining (sync-with-external-state).
- **no-undef** — ESLint config now applies node globals to api/, scripts/, vite.config.js and serviceworker globals to public/sw.js.
- **Dead Mux require() fallback** removed from VideoStudio.

---

## Phase 4 — Performance + PWA

### Bundle sizes (before → after)

| Chunk | Before | After |
|---|---|---|
| Entry index-*.js (gzip) | 126 KB | **7 KB** |
| vendor-react (gzip) | bundled into entry | 74 KB (cacheable across deploys) |
| vendor-supabase (gzip) | bundled into entry | 49 KB (cacheable across deploys) |
| dnd-kit (60 KB) | preloaded on every page | Now only in the lazy MySchools chunk |

Added vite.config.js build section with target: 'es2020', sourcemap: false, and a manualChunks function splitting Supabase + React/Router into vendor chunks.

### N+1 queries fixed

| Page | Before | After |
|---|---|---|
| AthleteDashboard.loadDashboardData | N+1: one schools.eq(name).single() per pipeline row | .in('name', schoolNames) + Map lookup |
| MySchools.jsx | N+1: one schools.eq(name).single() per pipeline row | .in('name', schoolNames) + Map lookup |
| src/lib/pipelineWithStats.js | 3N+1 queries inside Promise.all | 4 queries total regardless of pipeline size |

### PWA manifest lie fixed

public/eastside-fc-logo.png is actually a 618x576 JPEG (not PNG, not 192px, not 512px). Manifest claimed both sizes plus purpose: "any maskable" on a non-padded square. Now declares one honest entry: sizes: "any", type: "image/jpeg", purpose: "any".

### Other

- index.html: added preconnect for Supabase URL + dns-prefetch for image.mux.com and cdn.jsdelivr.net.
- Service worker registration in src/main.jsx verified — gated to PROD, updatefound → SKIP_WAITING, controllerchange → guarded reload.
- Mux player CDN script has duplicate-prevention + type="module" (implicitly deferred).

---

## Phase 5 — Stability + DX

- **ErrorBoundary added** (src/components/ErrorBoundary.jsx) wrapping above BrowserRouter in src/main.jsx. Calm "Something went wrong" card matching not-found visual style.
- **Supabase env var error** now names exactly which VITE_* var is missing.
- **Console noise gated** — 25 console.log calls across 5 files now behind import.meta.env.DEV via new devLog helper. console.error/console.warn left visible.
- **Outreach clipboard failure** now toasts the user.
- **Auth recovery** loop guard, 12s timeout, TOKEN_REFRESHED-doesn't-sign-out behavior all verified intentional.
- **Long-lived session stability** — all hot-page useEffects use user?.id (string) in deps, not user (object). No re-fetch loops on token refresh.

---

## Borderline issues flagged but not fixed

1. **vendor-supabase chunk includes the Realtime client (~50% of bundle)** — app doesn't subscribe to channels, but stripping requires switching to gotrue-js + postgrest-js directly. Risky days before pilot.
2. **Proper 512x512 maskable PNG** would improve Android home-screen install UX. Requires generating a new asset.
3. **mailto:support@eastsidefc.com in ErrorBoundary** is a placeholder — replace with canonical org admin email.
4. **signOut() clears all of localStorage** including krs_install_dismissed.
5. **12s withTimeout threshold** in useAuth — defensible.
6. **logOutreach / updateReplyStatus silent failures** in Outreach.jsx — cleanup writes that don't block primary flow.

---

## Migration files in this audit

| File | Status | Purpose |
|---|---|---|
| 042_highlight_videos.sql | Applied via MCP | Missing table backfill |
| 043_org_nil_deals.sql | Applied via MCP | Missing table backfill |
| 044_security_hardening_with_check.sql | **Apply before pilot** | RLS WITH CHECK clauses (impersonation fix) |
| 045_public_profile_privacy.sql | **No-op (superseded)** | Originally created bad views + USING(true) policies. Now a documented no-op pointing to 048 |
| 046_performance_indexes.sql | **Apply before pilot** | 19 FK indexes |
| 047_atomic_invite_consume.sql | **Apply before pilot** | consume_invite_code SECURITY DEFINER RPC |
| 048_public_profile_rpcs.sql | **Apply before pilot** | SECURITY DEFINER RPCs + anon REVOKE; supersedes 045 |

**IMPORTANT:** If migration 045 was already applied to your live DB before the corrigendum, applying 048 will clean it up — 048 explicitly DROPs the four `USING (true)` policies and both views from 045. Idempotent (uses IF EXISTS / OR REPLACE throughout).

---

## Pre-pilot checklist (operator action items)

1. **Apply migrations 044, 046, 047, 048 to live Supabase.** All idempotent. Skip 045 (no-op).
2. **If 045 was previously applied,** 048 will clean up its policies/views — apply 048 before opening any anon traffic to the new pilot.
3. **Verify env vars on Vercel:** VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (or publishable), SUPABASE_SERVICE_ROLE_KEY, plus Mux env vars before flipping VIDEO_STUDIO_ENABLED.
4. **Replace ErrorBoundary placeholder email** in src/components/ErrorBoundary.jsx.
5. **Sanity-check anon access** after 048 applies. Expected behavior:
   - `curl https://<project>.supabase.co/rest/v1/athletes?select=*` returns 401 (or empty array via PostgREST) for anon — not data.
   - `curl https://<project>.supabase.co/rest/v1/rpc/get_public_athlete_profile -d '{"p_profile_id":"<uuid>"}'` returns the safe column projection.
6. **(Optional)** generate a 512x512 safe-zone-padded PNG for the maskable icon.

---

## Files changed across the audit

ESLint config, package.json/vercel.json, vite.config.js, index.html, public/manifest.json, public/sw.js, new src/components/ErrorBoundary.jsx, new src/hooks/authContext.js, new src/contexts/themeContext.js, src/main.jsx, src/App.jsx, src/lib/supabase.js, src/lib/pipelineWithStats.js, src/pages/PublicAthleteProfile.jsx (RPC migration + height removal), every file in src/pages/ and src/pages/admin/ that had immutability/unused-vars errors, api/admin/validate-invite.js, supabase/migrations/044-048.
