-- Create invite_codes table
create table if not exists invite_codes (
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

-- Enable RLS
alter table invite_codes enable row level security;

-- Index for performance
create index if not exists idx_invite_codes_org on invite_codes (org_id);
create index if not exists idx_invite_codes_code on invite_codes (code);

-- Create a sample invite code for Eastside FC
insert into invite_codes (
  org_id,
  code,
  label,
  max_uses,
  active
) values (
  'a0000000-0000-0000-0000-000000000001',
  'EASTSIDE2026',
  'Eastside FC Pilot',
  50,
  true
) on conflict (code) do nothing;