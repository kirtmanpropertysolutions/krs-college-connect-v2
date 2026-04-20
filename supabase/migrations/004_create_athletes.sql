-- Create athletes table (athlete-specific data)
create table if not exists athletes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  org_id uuid references organizations(id) not null,
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

-- Enable RLS
alter table athletes enable row level security;

-- RLS policy: athletes read own data
create policy "Athletes read own data"
  on athletes for select
  using (user_id = auth.uid());

-- RLS policy: athletes update own data
create policy "Athletes update own data"
  on athletes for update
  using (user_id = auth.uid());

-- RLS policy: athletes insert own data
create policy "Athletes insert own data"
  on athletes for insert
  with check (user_id = auth.uid());

-- Index for performance
create index if not exists idx_athletes_user on athletes (user_id);
create index if not exists idx_athletes_org on athletes (org_id);