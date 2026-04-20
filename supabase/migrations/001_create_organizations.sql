-- Create organizations table (tenant table)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  slug text unique not null,
  logo_url text,
  primary_color text default '#dc2626',
  secondary_color text default '#0a1628',
  locale text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table organizations enable row level security;

-- Seed Eastside FC as the pilot organization
insert into organizations (
  id,
  name,
  short_name,
  slug,
  logo_url,
  primary_color,
  secondary_color,
  locale
) values (
  'a0000000-0000-0000-0000-000000000001',
  'Eastside FC Washington',
  'Eastside FC',
  'eastside-fc-wa',
  null, -- will be added later
  '#dc2626', -- crimson
  '#0a1628', -- deep navy
  'Seattle, WA'
) on conflict (id) do nothing;