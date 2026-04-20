-- Create remaining athlete-scoped tables

-- Social posts table
create table if not exists social_posts (
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

-- Clips table
create table if not exists clips (
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

-- Events saved table
create table if not exists events_saved (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references organizations(id) not null,
  event_id text not null,
  registered boolean default false,
  created_at timestamptz default now()
);

-- NIL deals table
create table if not exists nil_deals (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references organizations(id) not null,
  brand text not null,
  deal_type text,
  value numeric,
  status text default 'pending',
  created_at timestamptz default now()
);

-- School fit quiz table (one per athlete)
create table if not exists school_fit_quiz (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references auth.users(id) on delete cascade unique not null,
  org_id uuid references organizations(id) not null,
  answers jsonb not null,
  results jsonb not null,
  completed_at timestamptz default now()
);

-- Enable RLS on all tables
alter table social_posts enable row level security;
alter table clips enable row level security;
alter table events_saved enable row level security;
alter table nil_deals enable row level security;
alter table school_fit_quiz enable row level security;

-- RLS policies for social_posts
create policy "Athletes read own social_posts" on social_posts for select using (athlete_id = auth.uid());
create policy "Athletes insert own social_posts" on social_posts for insert with check (athlete_id = auth.uid());
create policy "Athletes update own social_posts" on social_posts for update using (athlete_id = auth.uid());
create policy "Athletes delete own social_posts" on social_posts for delete using (athlete_id = auth.uid());

-- RLS policies for clips
create policy "Athletes read own clips" on clips for select using (athlete_id = auth.uid());
create policy "Athletes insert own clips" on clips for insert with check (athlete_id = auth.uid());
create policy "Athletes update own clips" on clips for update using (athlete_id = auth.uid());
create policy "Athletes delete own clips" on clips for delete using (athlete_id = auth.uid());

-- RLS policies for events_saved
create policy "Athletes read own events_saved" on events_saved for select using (athlete_id = auth.uid());
create policy "Athletes insert own events_saved" on events_saved for insert with check (athlete_id = auth.uid());
create policy "Athletes update own events_saved" on events_saved for update using (athlete_id = auth.uid());
create policy "Athletes delete own events_saved" on events_saved for delete using (athlete_id = auth.uid());

-- RLS policies for nil_deals
create policy "Athletes read own nil_deals" on nil_deals for select using (athlete_id = auth.uid());
create policy "Athletes insert own nil_deals" on nil_deals for insert with check (athlete_id = auth.uid());
create policy "Athletes update own nil_deals" on nil_deals for update using (athlete_id = auth.uid());
create policy "Athletes delete own nil_deals" on nil_deals for delete using (athlete_id = auth.uid());

-- RLS policies for school_fit_quiz
create policy "Athletes read own quiz" on school_fit_quiz for select using (athlete_id = auth.uid());
create policy "Athletes insert own quiz" on school_fit_quiz for insert with check (athlete_id = auth.uid());
create policy "Athletes update own quiz" on school_fit_quiz for update using (athlete_id = auth.uid());

-- Indexes for performance
create index if not exists idx_social_posts_athlete on social_posts (athlete_id);
create index if not exists idx_clips_athlete on clips (athlete_id);
create index if not exists idx_events_saved_athlete on events_saved (athlete_id);
create index if not exists idx_nil_deals_athlete on nil_deals (athlete_id);
create index if not exists idx_quiz_athlete on school_fit_quiz (athlete_id);