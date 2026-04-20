-- Create org_members table (links auth users to organizations)
create table if not exists org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('admin', 'athlete')),
  created_at timestamptz default now(),
  unique (org_id, user_id)
);

-- Enable RLS
alter table org_members enable row level security;

-- RLS policy: users read only their own membership rows
create policy "Users read own memberships"
  on org_members for select
  using (user_id = auth.uid());

-- Index for performance
create index if not exists idx_org_members_user on org_members (user_id);
create index if not exists idx_org_members_org on org_members (org_id);