-- Create outreach table
create table if not exists outreach (
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

-- Enable RLS
alter table outreach enable row level security;

-- RLS policies for athlete-scoped access
create policy "Athletes read own outreach"
  on outreach for select
  using (athlete_id = auth.uid());

create policy "Athletes insert own outreach"
  on outreach for insert
  with check (athlete_id = auth.uid());

create policy "Athletes update own outreach"
  on outreach for update
  using (athlete_id = auth.uid());

create policy "Athletes delete own outreach"
  on outreach for delete
  using (athlete_id = auth.uid());

-- Index for performance
create index if not exists idx_outreach_athlete on outreach (athlete_id);
create index if not exists idx_outreach_org on outreach (org_id);