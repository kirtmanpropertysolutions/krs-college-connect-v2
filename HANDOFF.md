# KRS College Connect — Handoff Brief

A complete spec + technical context + remaining work, written so another
agent or developer can pick this up cold and be productive immediately.

---

## SPEC — What this is

**KRS College Connect** is a recruiting platform for ECNL girls' soccer
clubs. The pilot is **Eastside FC Washington** (16 athletes + 1 admin).
The product makes the otherwise chaotic college-recruiting process
structured, gamified, and motivating for teen athletes — and gives club
directors a tool to manage their pipeline of recruits.

**Live URL:** https://www.krscollegeconnect.com
**Owner:** Chanyn Kirtman (kirtmanpropertysolutions@gmail.com)

### Audiences

- **Athletes** (primary) — ECNL girls' soccer players, ages 13–18,
  largely iPhone-first. Sign up via club invite code. Use the platform
  daily to research schools, outreach coaches, log activity, track ID
  camps, build budgets.
- **Club Admins / Directors** — Manage their club's roster, send
  announcements, curate ID camps, create invite codes, see who's
  active vs. lagging.
- **College Coaches** (passive) — They never log in. They receive
  emails athletes send from their own Gmail, and click through to view
  the athlete's public recruiting profile at `/p/{athleteId}`.

### Four pillars of the product

1. **Athlete Profiles & Recruiting Score** — Complete athlete bio
   (position, GPA, class year, photo, video links, bio), exposed at
   the public `/p/{id}` URL for coaches.
2. **Coach Outreach** — Browse 296 D1 schools, see ~4,100 scraped
   coaches with verified emails (3,800+ with valid email), draft
   template-based emails, send via Gmail from the athlete's own
   account, log replies.
3. **College Program Explorer** — School Fit Quiz (11 questions →
   top-10 personalized matches), coach finder, public school cards
   with academic + athletic data.
4. **Admin Dashboard** — Athlete roster with completion-status chips,
   announcements, invite codes, NIL partnerships, ID camps.

### Gamification layer (the engagement engine)

- **Tier ladder**: Rookie → Squad Player → Starter → Captain → Elite,
  earned by accumulating milestones.
- **25 milestones** across 6 tiers: Onboarding (4), Pipeline (3),
  Outreach (5), Real World (4), Engagement (4), Production (5).
- **Active Quests** on the dashboard surface the next 3 highest-value
  unearned milestones with smart prioritization (starter-pack for new
  athletes, "almost there" boost for counting milestones, big-unlock
  flag for high-impact ones).
- **Celebration system**: bottom toast on each new milestone, full
  screen modal on tier promotion.
- **Public profile** shows earned badges so coaches see athlete
  engagement, not just stats.

### Side features

- **ID Camp tracking** — Director curates camps via `/admin/camps`;
  athletes browse + register via `/recruiting-events`. Auto-flips
  registered → attended once the camp date passes.
- **Budget Builder** at `/budget` — Athletes track per-camp cost
  breakdown (fee, travel, lodging, food, gear, misc) with live chart
  showing total spend across all camps.
- **Outreach Inbox** — Admin announcements flow to athletes' inbox.
- **PWA** — Installable to phone home screen via Safari "Add to Home
  Screen" or Chrome "Install". Has service worker for offline + auto-
  update on new deploys.
- **Forgot Password** — Standard Supabase email-link reset flow.
- **Photo upload** — EXIF-stripped + auto-resized to 1200px max
  longest side, stored in Supabase Storage bucket `athlete-photos`.

---

## CONTEXT — How it's built

### Stack

- **React 19** + **Vite 8**, plain JavaScript (no TypeScript)
- **Tailwind CSS** with custom design tokens (crimson, navy, gold,
  Oswald display + Manrope body)
- **Supabase** for Postgres + Auth + RLS + Storage + Edge Functions
- **Vercel** for hosting + serverless API routes (`/api/admin/*`)
- **lucide-react** for icons (v1.9 — `Instagram`, `Youtube` NOT
  exported; aliased where needed)
- **react-router-dom** v7 with **React.lazy()** route code-splitting
- **date-fns** for dates, **@dnd-kit** for drag-and-drop in Pipeline
- **@mux/mux-player-react** + **@mux/mux-uploader-react** for video
  (Video Studio currently gated by `VIDEO_STUDIO_ENABLED = false` in
  `src/pages/VideoStudio.jsx`; flip when Mux env vars are added)

### Project IDs

- **Vercel project**: `krs-college-connect`
  (`prj_U93dOm8Us0Mmif1sJsOofrQxC9pj`)
- **Vercel team**: `kirtmanpropertysolutions-projects`
  (`team_gWfHU6131JFiX3kHGvyFqawh`)
- **Supabase project**: `krs-college-connect-v2`
  (`vhndqfsbhhfnpinixofe`) at https://supabase.com/dashboard/project/vhndqfsbhhfnpinixofe
- **Domain**: `krscollegeconnect.com` (apex) + `www.krscollegeconnect.com`

### Environment variables (Vercel production)

- `VITE_SUPABASE_URL` = `https://vhndqfsbhhfnpinixofe.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = (anon key, baked into frontend)
- `SUPABASE_SERVICE_ROLE_KEY` = (server-only, used by `/api/admin/*`
  endpoints)

When troubleshooting auth/signup, hit
`https://www.krscollegeconnect.com/api/admin/healthz` — returns a
JSON diagnostic showing whether env vars are present and the service
role key can read the database.

### Database schema highlights

Core tables:
- `profiles` — user metadata, role ('admin' | 'athlete'), org_id
- `organizations` — clubs (currently 1: Eastside FC,
  `a0000000-0000-0000-0000-000000000001`)
- `org_members` — many-to-many user ↔ org with role
- `athletes` — athlete-specific data (position, class_year, gpa, etc.)
- `schools` — 296 D1 schools + NAIA expansion, ~5 sub-D1 holdouts
- `coaches` — 4,143 coaches, 3,883 with email
- `pipelines` — athlete ↔ school relationship with stage
- `outreach` — athlete-sent emails with reply tracking
- `school_fit_quiz_responses` — SFQ answers per user
- `highlights` — athlete-added external video URLs
- `recruiting_activity` — activity feed events
- `announcements` — admin-to-club messages
- `invite_codes` — admin-issued signup codes
- `scheduled_camps` — athlete's personal ID camp schedule (with cost
  breakdown columns for Budget Builder)
- `id_camps` — admin-curated camp catalog (NEW)
- `milestones` — 25-badge gamification catalog
- `athlete_milestones` — earned-records junction

RLS is **extensively used** — every table has SELECT/INSERT/UPDATE/
DELETE policies that gate by `auth.uid()` + `org_members.role`.
Service-role key bypasses RLS and is used only in
`/api/admin/validate-invite` and `/api/admin/healthz`.

### Code structure

- `src/App.jsx` — All routes; admin vs athlete role-gated; lazy-loaded
- `src/main.jsx` — Root, registers service worker (production only)
- `src/hooks/useAuth.jsx` — Auth context, profile loading, self-heal
  timeouts (12s per query → clears stale token + reloads on init only)
- `src/lib/supabase.js` — Supabase client with `noopLock` to disable
  cross-tab navigator lock (was causing stuck-on-Loading bug)
- `src/lib/milestones.js` — Gamification engine. Two key functions:
  `getCurrentlyQualifying(userId)` returns set of milestone IDs the
  athlete currently qualifies for; `syncMilestones(userId, orgId)`
  diffs that against earned set, INSERTs new + DELETEs stale (with
  `PERMANENT_MILESTONES` exemption set, currently just
  `first_month_active`).
- `src/lib/activeQuests.js` — Active-quest picker with starter-pack
  + almost-there heuristics
- `src/lib/imageUtils.js` — `stripExifAndResize(file)` — canvas re-
  encode kills metadata + caps longest side at 1200px
- `src/lib/fitScore.js` — School Fit Quiz scoring (100-pt algorithm)
- `src/lib/streaks.js` — Daily streak from `recruiting_activity`
- `src/components/AthleteLayout.jsx` — Mobile bottom-tab + drawer +
  sticky header; safe-area-aware
- `src/components/AdminLayout.jsx` — Single horizontal nav with
  crimson active pill
- `src/components/SchoolDetailModal.jsx` — Used by Dashboard,
  MySchools, CoachFinder. **Has an ID normalization layer at the top**
  (`realSchoolId = school?.schools?.id || school?.id`) because
  MySchools merges pipeline+school which clobbers `school.id`.
- `src/components/OnboardingOverlay.jsx` — First-login spotlight
  walkthrough (3 steps, tracked in localStorage)
- `src/components/InstallCTA.jsx` — PWA install prompt (smart iOS vs
  Chrome detection)
- `src/components/MilestoneToast.jsx` + `TierPromotionModal.jsx` —
  Celebration components
- `src/pages/AthleteDashboard.jsx` — Gamification-first layout: tier
  card, active quests, recently earned, trophy preview, slim stats,
  smaller supporting cards. Milestone sweep deferred 400ms after
  first paint.
- `src/pages/Milestones.jsx` — Full trophy room with tier ladder
  strip, filter pills, badge detail sheet
- `src/pages/Budget.jsx` — Camp cost tracker with stacked bar chart
- `src/pages/Outreach.jsx` — Compose / Pipeline / Inbox / Sent tabs;
  Gmail send uses synchronous `window.location.href` on mobile to
  preserve user-gesture context
- `src/pages/RecruitingEvents.jsx` — Athlete-facing ID camp browser
- `src/pages/admin/AdminCamps.jsx` — Director's camp catalog manager
- `src/pages/admin/AdminAthletes.jsx` — Roster with completion chips,
  remove flow (RLS migration 036 allows admin DELETE on org_members
  + UPDATE on profiles for revocation)
- `src/pages/PublicAthleteProfile.jsx` — Public coach-facing profile
  at `/p/{id}`, bypasses auth
- `src/pages/ForgotPasswordPage.jsx` + `ResetPasswordPage.jsx` —
  Password reset flow. **Supabase Auth → URL Configuration → Site URL
  must be set to `https://www.krscollegeconnect.com`** and Redirect
  URLs must include `https://www.krscollegeconnect.com/**` or the
  email link lands on localhost.
- `public/sw.js` — Service worker; network-only for /api+Supabase,
  network-first for HTML navigations, cache-first for hashed
  /assets/*. Handles SKIP_WAITING message from main.jsx for auto-
  update.

### Key gotchas

These have cost real debugging time — write them down:

1. **`pipeline.id` shadows `school.id` in MySchools.** The merge
   `{...schoolData, ...pipeline}` overwrites the schools row id with
   the pipelines row id. SchoolDetailModal handles via
   `realSchoolId = school?.schools?.id || school?.id` normalization.
   If you add a new place that queries by school.id, use the
   normalized value.

2. **Empty strings in URL fields.** `athletes.hudl_url`, etc. may be
   `""` (empty string) rather than NULL. SQL `IS NOT NULL` returns
   true for these; JS `if (url)` returns false. Always trim and
   length-check, never just `!= null`.

3. **Service-role key was added after first athlete signups
   broke.** If signups break again, hit `/api/admin/healthz` first.

4. **Supabase navigator lock hangs.** We disabled it via `noopLock`
   in `src/lib/supabase.js`. If you ever upgrade `@supabase/supabase-js`,
   verify the lock config still works.

5. **lucide-react v1.9 missing exports.** `Instagram` and `Youtube`
   are not exported. Aliased: `Share2` for Instagram, `Film as
   YoutubeIcon` for Youtube. If a build breaks on icon import, swap to
   a similar-shaped icon from the library.

6. **iOS Safari + popups.** Outreach + Profile Gmail buttons must
   navigate synchronously (`window.location.href`). Any `await` before
   navigation drops the user-gesture context and the redirect silently
   fails. Logging is fire-and-forget after navigation.

7. **iOS standalone PWA + cross-domain links.** Tapping a Gmail link
   from inside the installed PWA opens Safari (not Gmail app). User
   has to come back via the home screen icon.

8. **Backdrop-filter blur kills iOS performance.** Removed via media
   query on mobile. Keep it that way unless you also test on iPhone 11.

9. **Pipeline `stage` values** in code: `'interested'`, `'contacted'`,
   `'visiting'`, `'offer'`, `'committed'`. Milestone engine maps
   visiting → first_visit_scheduled, offer/committed → first_offer.

10. **Brand identity is dark-mode-first.** A light-mode toggle exists
    in code but is intentionally underbuilt. Removed from the UI per
    recent discussion. If light mode is re-requested, build it as a
    full parallel palette refactor (~3-4 hours), not a half-measure.

### Coach scraper

`scripts/scrape-coaches.js`. Flags:
- `--only-empty` — only schools with zero coaches
- `--missing-emails` — schools with coaches but missing email addrs
- `--division=D1` — restrict by division
- `--limit=N` — cap iteration count

29 URL patterns, Sidearm Sports v1 + v2 selectors, fallback
head-coach regex. Re-run when adding new schools or after several
weeks (athletics sites update).

### Deploys

- Run `vercel --prod` from `~/krs-v2` (Vercel CLI is logged in on
  Chanyn's Mac).
- Auto-update flow handles existing installed PWAs — they detect the
  new SW, reload once silently.

### Brand tokens

```css
--crimson: #C8102E
--crimson-2: #A00C25
--crimson-3: #E11A38
--navy-dark: #0a0e1a
--navy-mid: #111827
--navy-light: #131b2c
--gold: #fbbf24
```

Display font: Oswald (uppercase, tracked, condensed) — H1/H2/headlines.
Body font: Manrope — paragraphs, UI text.

---

## TAR — Tasks at Rest / Remaining Work

### High-value, blocking real-world use

- **Onboard the 16 actual Eastside FC athletes.** This is the single
  most important thing left. Everything is built. Send invite codes
  via Gmail and watch what breaks.
- **Mux video integration.** Set up Mux account, add three Vercel env
  vars (`MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `VITE_MUX_ENV_KEY`), flip
  `VIDEO_STUDIO_ENABLED` to `true` in `src/pages/VideoStudio.jsx`.
  Most of the code is already there — Chanyn wired Mux components
  in earlier.
- **Bulk admin invite.** Currently each invite code is sent
  one-at-a-time via Gmail. Should be: paste 16 emails → one flow
  sends to all.

### Quick wins (~1 hour each)

- **Seed the 6 holdout schools without coach data**: Cal State LA,
  Pepperdine, Seattle, San Francisco, Wake Forest, Weber State.
  Manual SQL after grabbing head coach + email from each school's
  staff page. Brings D1 coverage to 100%.
- **Custom SMTP for transactional emails** so password resets stop
  landing in spam. Resend or SendGrid + DKIM/SPF DNS records on
  krscollegeconnect.com.
- **Admin "athletes lagging" view** — On `/admin/athletes` add a
  filter showing athletes who haven't earned a milestone in 14+ days.
- **Coach email verification badge** — Mark scraped emails as
  "verified" vs "pattern-guessed" so athletes know which might bounce.
- **Public profile design polish** — `/p/{id}` works but reads
  plainer than the rest of the app.

### Medium projects (~4-8 hours each)

- **Multi-tenant theming refactor.** Eastside FC name/crest/colors
  are hardcoded in several places. Before adding a second club, move
  these to the `organizations` table and pull from `useTheme`. Worth
  doing BEFORE club #2, not after.
- **Outreach email scheduling.** Draft now, send Tuesday 9am.
- **Push notifications.** Service worker subscription + Web Push
  + a notification service (Knock, Novu, or rolling on Supabase Edge
  Functions). "Coach replied to your email", "Maya unlocked Captain
  tier".
- **Coach reply ingestion.** Currently athletes manually log replies.
  Real version would Gmail-OAuth and parse inbound replies. Big lift.

### Business/strategy (non-code)

- **Second pilot club.** Once Eastside is running smoothly.
- **App Store submission via PWABuilder.** Wait until first club is
  happy + you have testimonials. iOS approval is 1-2 weeks first time.
- **Privacy Policy + Terms of Service.** Template + lawyer review.
  Required for App Store.
- **Pricing model.** Currently free during pilot. Subscription per
  athlete? Per club? Decide before commercializing.

### Known-deferred (won't fix unless asked)

- **Light mode.** Removed from UI; brand is dark-mode-first.
- **Multi-org per athlete.** Schema supports it (org_members table is
  many-to-many) but UI assumes one club per athlete.

---

## How to pick this up cold

1. Clone the repo from
   `git@github.com:kirtmanpropertysolutions/krs-college-connect-v2.git`
2. `cd ~/krs-v2 && npm install`
3. Pull env vars: `vercel link` then `vercel env pull .env.local`
4. `npm run dev` — runs on Vite dev server. Service worker is
   disabled in dev to avoid HMR conflicts.
5. Sign in as Chanyn (admin) or kpsfund@gmail.com (test athlete) to
   explore.
6. Make changes, `vercel --prod` deploys to production. Existing
   installed PWAs auto-update on next launch.
7. Database changes go via Supabase MCP `apply_migration` or
   manually in the Supabase dashboard SQL editor. Schema migrations
   live in `supabase/migrations/*.sql`.

**If something is broken, check in this order:**

1. `/api/admin/healthz` — confirms server-side env vars
2. Browser DevTools console — useAuth logs are emoji-prefixed
3. Vercel runtime logs — `get_runtime_logs` MCP tool or dashboard
4. Supabase logs — for RLS denials and slow queries

Good luck.
