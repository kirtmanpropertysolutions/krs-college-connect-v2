-- Admin-managed sponsor deals (org-level NIL partnerships)
-- Directors/admins create these; athletes see them in the NIL Deals section.
-- This is separate from the athlete-scoped nil_deals table (008) which tracks
-- individual athlete deal applications/history.

create table if not exists org_nil_deals (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references organizations(id) not null,
  created_by      uuid references auth.users(id),

  -- Sponsor identity
  brand           text not null,
  logo_abbrev     text,          -- e.g. "NIKE", shown in brand avatar
  logo_color      text,          -- hex, e.g. "#000000"

  -- Classification
  category        text,          -- e.g. "Apparel", "Food & Bev", "Tech", "Local biz"
  deal_type       text,          -- e.g. "gear", "camps", "coaching", "apparel", "cash", "product"

  -- Compensation
  value           numeric,       -- numeric amount for sorting/filtering
  payout_display  text,          -- human-readable string, e.g. "$500 – $1,500"

  -- Details
  description     text,
  requirements    text,
  expiration_date date,

  -- Targeting
  applies_to      text default 'all',  -- 'all' | 'grad_year' | 'specific'
  grad_years      int[],               -- e.g. {2025, 2026} when applies_to = 'grad_year'

  -- Lifecycle
  status          text default 'Open', -- 'Open' | 'Closed'
  featured        boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Enable RLS
alter table org_nil_deals enable row level security;

-- All org members (athletes + admins) can read their org's deals
create policy "Org members read org nil deals"
  on org_nil_deals for select
  using (
    org_id in (
      select org_id from org_members where user_id = auth.uid()
    )
  );

-- Only admins in the org can create deals
create policy "Admins insert org nil deals"
  on org_nil_deals for insert
  with check (
    org_id in (
      select org_id from org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Only admins in the org can update deals
create policy "Admins update org nil deals"
  on org_nil_deals for update
  using (
    org_id in (
      select org_id from org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Only admins in the org can delete deals
create policy "Admins delete org nil deals"
  on org_nil_deals for delete
  using (
    org_id in (
      select org_id from org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Indexes
create index if not exists idx_org_nil_deals_org on org_nil_deals (org_id);
create index if not exists idx_org_nil_deals_status on org_nil_deals (status);
