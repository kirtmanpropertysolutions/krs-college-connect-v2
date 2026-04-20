-- Create profiles table (extended user info)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id),
  email text,
  full_name text,
  role text,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- RLS policy: users read own profile
create policy "Users read own profile"
  on profiles for select
  using (id = auth.uid());

-- RLS policy: users update own profile
create policy "Users update own profile"
  on profiles for update
  using (id = auth.uid());

-- Index for performance
create index if not exists idx_profiles_org on profiles (org_id);