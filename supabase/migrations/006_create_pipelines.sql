-- Create pipelines table (the "My Schools" table)
create table if not exists pipelines (
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

-- Enable RLS
alter table pipelines enable row level security;

-- RLS policies for athlete-scoped access
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

-- Index for performance
create index if not exists idx_pipelines_athlete on pipelines (athlete_id);
create index if not exists idx_pipelines_org on pipelines (org_id);