-- Create org-scoped and shared tables

-- Coaches table (shared across the whole platform, not org-scoped)
create table if not exists coaches (
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

-- Announcements table (org-scoped)
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) not null,
  title text not null,
  body text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Content library table (org-scoped)
create table if not exists content_library (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) not null,
  title text,
  url text,
  kind text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table coaches enable row level security;
alter table announcements enable row level security;
alter table content_library enable row level security;

-- RLS policies for coaches (readable by all authenticated users)
create policy "Authenticated users can read coaches"
  on coaches for select
  using (auth.role() = 'authenticated');

-- RLS policies for announcements (org members can read their org's announcements)
create policy "Org members read org announcements"
  on announcements for select
  using (
    org_id in (
      select org_id from org_members where user_id = auth.uid()
    )
  );

-- RLS policies for content_library (org members can read their org's content)
create policy "Org members read org content"
  on content_library for select
  using (
    org_id in (
      select org_id from org_members where user_id = auth.uid()
    )
  );

-- Indexes for performance
create index if not exists idx_coaches_school on coaches (school);
create index if not exists idx_coaches_division on coaches (division);
create index if not exists idx_announcements_org on announcements (org_id);
create index if not exists idx_content_library_org on content_library (org_id);