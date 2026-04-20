---
name: krs-architecture
description: Load this skill at the start of ANY work on KRS College Connect. It contains the foundational architecture decisions that must not be violated — multi-tenant from day one, server-side admin operations, no browser-exposed secrets, and the rules for Row Level Security. Trigger whenever the user mentions KRS, College Connect, Eastside FC, athlete recruiting, or works in a project directory containing this codebase.
---

# KRS College Connect — Architecture Rules

This skill captures non-negotiable architecture decisions. A previous version of this app accumulated technical debt by violating these rules across many sessions. Every decision here is the result of a specific bug or security issue we hit. Do not deviate.

## Product vision in one sentence

KRS College Connect is a multi-tenant SaaS platform that ECNL soccer clubs license so their athletes can manage college coach outreach, highlight reels, NIL education, and recruiting events. Pilot club is Eastside FC Washington. Month 2 goal is onboarding additional clubs at scale.

## Foundational rules — DO NOT VIOLATE

### 1. Multi-tenant from day one

Every user-scoped table has an `org_id` column. Every query filters by `org_id` in addition to `user_id` or `athlete_id`. There is no "single-club mode" to retrofit later. The canonical org table is named `organizations` (never `orgs` — a prior Claude used `orgs` and it caused an 18-mismatch migration cascade).

Seed the first org during initial setup:
- id: `a0000000-0000-0000-0000-000000000001`
- name: Eastside FC Washington
- slug: eastside-fc-wa

### 2. Service role key NEVER touches the browser

The Supabase service role key (the one that bypasses RLS) must ONLY be used in server-side code: Vercel serverless functions at `/api/*`, or Supabase Edge Functions. Never expose it via a `VITE_` prefix in `.env`.

Environment variable naming:
- `VITE_SUPABASE_URL` — public, fine to expose
- `VITE_SUPABASE_ANON_KEY` — public, fine to expose
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, NO VITE_ prefix

All admin operations (deleting users, managing invite codes, sending announcements, uploading content) go through `/api/admin/*` serverless functions that verify the caller's admin status server-side, then use the service role key.

### 3. Row Level Security must be simple and non-recursive

RLS policies must never query the same table they protect (causes infinite recursion). Safe patterns:
- User reads own rows: `user_id = auth.uid()` or `athlete_id = auth.uid()`
- Org members read org data: use a SECURITY DEFINER function, or a join against `org_members` with a simple `user_id = auth.uid()` filter (not a recursive membership check)

If a policy needs complex logic, write a Postgres SECURITY DEFINER function and call it from the policy. Never let a policy recurse into the table it protects.

### 4. Athlete-scoped tables use `athlete_id`, not `user_id`

Tables that belong to an athlete (pipelines, outreach, social_posts, clips, nil_deals, school_fit_quiz) use `athlete_id` as the foreign key to `auth.users.id`. Reserved columns `user_id` are for non-athlete-specific records like `org_members`.

### 5. No hardcoded seed data that contaminates fresh accounts

Demo data, sample athlete names, placeholder profiles must never ship in production code. New accounts start empty. The pilot club seeds its real athletes via the admin invite flow.

### 6. Trim environment variables

Supabase URL and keys often get whitespace or trailing newlines pasted in. Always trim env vars at app startup:

```js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
```

A trailing newline in the URL silently corrupts the client and caused hours of debugging in a prior build.

### 7. Email delivery uses Resend via custom SMTP

Supabase's default email rate limit (2/hour) is a production blocker. Set up Resend as custom SMTP in Supabase project settings before any auth flow launches. Resend API key lives in Supabase dashboard, not in code.

### 8. Git author email matches GitHub

Before first commit from any new machine, run:

```
git config --global user.email "kirtmanpropertysolutions@gmail.com"
```

Vercel blocks deployments from author emails that don't match a GitHub account. A prior build hit this wall after a force-push.

### 9. No VIEW drops without DROP IF EXISTS

When modifying a database VIEW, always `DROP VIEW IF EXISTS` before `CREATE VIEW`. Postgres will not allow CREATE OR REPLACE to change a view's column signature.

### 10. No CREATE POLICY IF NOT EXISTS inside DO blocks

Postgres does not support `CREATE POLICY IF NOT EXISTS`. Wrap policy creation in a DO block that checks `pg_policies` first:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'x' AND policyname = 'y') THEN
    CREATE POLICY "y" ON x FOR SELECT USING (...);
  END IF;
END $$;
```

## Tech stack (locked)

- Frontend: React + Vite + Tailwind CSS
- Database/Auth: Supabase (Postgres + Auth + RLS)
- Deployment: Vercel (auto-deploy from `main` branch)
- Email: Resend via Supabase custom SMTP
- Domain: Namecheap (krscollegeconnect.com)
- Payments (Month 2+): Stripe

No framework changes without rewriting this file.

## Project structure

```
src/
  pages/              # Route-level components
  components/         # Reusable UI
  hooks/
    useAuth.jsx       # THE canonical auth hook. Do not fork.
    useAppData.js     # App-wide data fetching
  lib/
    supabase.js       # ONE client for anon use. No supabaseAdmin in frontend code.
    pipeline.js       # Pipeline CRUD
    ...
api/
  admin/              # Server-side admin operations. Service role key used here only.
supabase/
  migrations/         # Numbered SQL migrations. Live DB is source of truth.
```

## When in doubt

Ask the user. Do not invent architecture. Do not "helpfully" rename things from this spec. If a prior session violated these rules, flag it and fix rather than propagate.
