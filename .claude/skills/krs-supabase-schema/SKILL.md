---
name: krs-supabase-schema
description: Load this skill before making ANY database change, writing migrations, creating tables, or querying Supabase in KRS College Connect. Contains the canonical multi-tenant schema that must be respected. Trigger whenever working with Supabase, Postgres, migrations, RLS policies, or anything matching the word "database" in a KRS context.
---

# KRS College Connect — Canonical Schema

This is the source of truth for the database. Do not invent tables or columns. If a new feature needs new tables, propose them to the user first and add them to this document when approved.

## Core principle

The schema is multi-tenant. Every data table that holds user-scoped information has an `org_id` column. Row Level Security policies enforce tenant isolation.

## Tables

### `organizations`

The tenant table. One row per ECNL club licensing the platform.

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  slug text unique not null,
  logo_url text,
  primary_color text default '#0a2540',
  secondary_color text default '#c8102e',
  locale text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Seed row:
- id: `a0000000-0000-0000-0000-000000000001`
- name: Eastside FC Washington
- slug: eastside-fc-wa

### `org_members`

Links auth users to organizations. Supports both athletes and admins.

```sql
create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'athlete')),
  created_at timestamptz default now(),
  unique (org_id, user_id)
);
```

RLS: users read only their own membership rows. `user_id = auth.uid()`.

### `profiles`

Extended user info. One row per auth user.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id),
  email text,
  full_name text,
  role text,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### `athletes`

Athlete-specific data. Keyed by user_id but conceptually different from profile.

```sql
create table athletes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  org_id uuid references organizations(id),
  position text,
  class_year int,
  gpa numeric(3,2),
  height_cm int,
  bio text,
  highlight_reel_url text,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Athlete-scoped tables — all use `athlete_id`

These tables belong to an individual athlete. The FK column is `athlete_id` pointing to `auth.users(id)` for consistency with `auth.uid()` in RLS policies.

#### `pipelines` (the "My Schools" table)

```sql
create table pipelines (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references organizations(id) not null,
  school text not null,
  coach_name text,
  coach_email text,
  status text default 'contacted' check (status in ('contacted', 'replied', 'interested', 'hot', 'committed', 'cold')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

**Status constraint important:** the allowed statuses are listed above. Do not use "targeting" — a prior build failed on this constraint.

#### `outreach`

```sql
create table outreach (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references organizations(id) not null,
  coach_name text,
  school text,
  email text,
  subject text,
  body text,
  status text default 'draft',
  sent_at timestamptz,
  created_at timestamptz default now()
);
```

#### `social_posts`

```sql
create table social_posts (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references organizations(id) not null,
  platform text,
  content text,
  scheduled_date date,
  scheduled_time time,
  status text default 'draft',
  created_at timestamptz default now()
);
```

#### `clips`

```sql
create table clips (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references organizations(id) not null,
  title text,
  type text,
  date date,
  opponent text,
  duration int,
  video_url text,
  views int default 0,
  shares int default 0,
  youtube_status text,
  created_at timestamptz default now()
);
```

#### `events_saved`

```sql
create table events_saved (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references organizations(id) not null,
  event_id text not null,
  registered boolean default false,
  created_at timestamptz default now()
);
```

#### `nil_deals`

```sql
create table nil_deals (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references organizations(id) not null,
  brand text not null,
  deal_type text,
  value numeric,
  status text default 'pending',
  created_at timestamptz default now()
);
```

#### `school_fit_quiz`

```sql
create table school_fit_quiz (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references auth.users(id) on delete cascade unique not null,
  org_id uuid references organizations(id) not null,
  answers jsonb not null,
  results jsonb not null,
  completed_at timestamptz default now()
);
```

One row per athlete. `unique` constraint on athlete_id.

### Org-scoped tables

#### `coaches`

Not org-scoped — this is a shared directory across the whole platform.

```sql
create table coaches (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  title text,
  school text,
  division text,
  conference text,
  city text,
  state text,
  website text,
  program_url text,
  sport text default 'mens_soccer',
  gender text,
  verified boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

**Column names matter:** `full_name` (not `name`), `notes` (not `note`). A prior build mixed these up and needed a correction migration.

#### `invite_codes`

```sql
create table invite_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) not null,
  code text unique not null,
  label text,
  max_uses int,
  uses int default 0,
  active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);
```

#### `announcements`

```sql
create table announcements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) not null,
  title text not null,
  body text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
```

#### `content_library`

```sql
create table content_library (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) not null,
  title text,
  url text,
  kind text,
  created_at timestamptz default now()
);
```

## RLS policy patterns

Enable RLS on every table. Policies follow these patterns.

### Athlete-scoped tables (pipelines, outreach, clips, etc.)

```sql
alter table pipelines enable row level security;

create policy "Athletes read own pipelines"
  on pipelines for select
  using (athlete_id = auth.uid());

create policy "Athletes insert own pipelines"
  on pipelines for insert
  with check (athlete_id = auth.uid());

create policy "Athletes update own pipelines"
  on pipelines for update
  using (athlete_id = auth.uid());

create policy "Athletes delete own pipelines"
  on pipelines for delete
  using (athlete_id = auth.uid());
```

### org_members — SIMPLE, never recursive

```sql
alter table org_members enable row level security;

create policy "Users read own memberships"
  on org_members for select
  using (user_id = auth.uid());
```

Do not write a policy like "users read org_members where they belong to the same org" — that's recursive and causes infinite recursion errors.

### Admin operations bypass RLS via server-side code

Admin operations like deleting athletes, managing invite codes, sending announcements use the service role key in serverless functions at `/api/admin/*`. They bypass RLS intentionally after verifying admin status server-side.

## Constraints to remember

- Pipeline status must be one of: contacted, replied, interested, hot, committed, cold
- School Fit Quiz has a unique constraint on athlete_id (one quiz per athlete)
- Invite codes have a unique constraint on code

## Indexes

Add indexes on foreign keys and commonly-filtered columns:

```sql
create index idx_pipelines_athlete on pipelines (athlete_id);
create index idx_pipelines_org on pipelines (org_id);
create index idx_outreach_athlete on outreach (athlete_id);
create index idx_clips_athlete on clips (athlete_id);
create index idx_coaches_school on coaches (school);
create index idx_coaches_division on coaches (division);
```

## When adding new tables

1. Propose the schema to the user first
2. Include `org_id` if org-scoped or athlete-scoped
3. Use `athlete_id` (not `user_id`) on athlete-scoped tables
4. Add RLS policies following the patterns above
5. Write the migration with `IF NOT EXISTS` guards
6. Update this skill document
