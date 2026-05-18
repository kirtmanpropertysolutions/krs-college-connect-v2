-- 038_milestones.sql
-- Gamification: milestones (catalog) + athlete_milestones (earned).
CREATE TABLE IF NOT EXISTS milestones (
  id           text PRIMARY KEY,
  tier         text NOT NULL,
  name         text NOT NULL,
  description  text NOT NULL,
  icon         text NOT NULL,
  points       integer NOT NULL DEFAULT 1,
  sort_order   integer NOT NULL DEFAULT 0
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read milestones" ON milestones;
CREATE POLICY "Authenticated read milestones"
  ON milestones FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS athlete_milestones (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id   text NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  org_id         uuid REFERENCES organizations(id),
  earned_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone_id)
);

CREATE INDEX IF NOT EXISTS athlete_milestones_user_idx ON athlete_milestones (user_id);
CREATE INDEX IF NOT EXISTS athlete_milestones_org_idx  ON athlete_milestones (org_id);

ALTER TABLE athlete_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own milestones" ON athlete_milestones;
CREATE POLICY "Users read own milestones"
  ON athlete_milestones FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read org milestones" ON athlete_milestones;
CREATE POLICY "Admins read org milestones"
  ON athlete_milestones FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Seed all 25 milestone definitions across 6 tiers
INSERT INTO milestones (id, tier, name, description, icon, points, sort_order) VALUES
  ('profile_complete',         'onboarding',  'Profile Complete',  'Filled out 80% of your athlete profile fields.',                  'UserCheck',     1, 1),
  ('quiz_taken',               'onboarding',  'Quiz Taken',        'Completed the School Fit Quiz — your top 10 matches.',            'ClipboardCheck',1, 2),
  ('headshot_up',              'onboarding',  'Photo Uploaded',    'Uploaded a profile photo coaches will see.',                      'Camera',        1, 3),
  ('reel_linked',              'onboarding',  'Video Added',       'Added your first highlight video link.',                          'Link',          1, 4),
  ('first_school',             'pipeline',    'School Added',      'Added your first school to your pipeline.',                       'School',        1, 1),
  ('ten_schools',              'pipeline',    '10 Schools',        'Your pipeline now has 10 schools — real options on the table.',   'Stack2',        2, 2),
  ('multi_stage_pipeline',     'pipeline',    'Active Pipeline',   'You have schools across at least 3 pipeline stages.',             'Route',         2, 3),
  ('first_outreach',           'outreach',    'Coach Emailed',     'Sent your first coach email. The hardest one is done.',           'Mail',          2, 1),
  ('first_reply',              'outreach',    'Coach Replied',     'Logged your first coach reply — you''re in a conversation.',      'MessageCircle', 2, 2),
  ('five_sends',               'outreach',    '5 Coaches Emailed', 'Sent emails to 5 different coaches.',                             'Send',          2, 3),
  ('twenty_sends',             'outreach',    '20 Coaches Emailed','Sent emails to 20 different coaches.',                            'Mailbox',       3, 4),
  ('first_positive_reply',     'outreach',    'Positive Reply',    'Logged a positive coach reply.',                                  'ThumbsUp',      3, 5),
  ('first_id_camp_registered', 'real_world',  'Camp Registered',   'Signed up for your first ID camp.',                               'CalendarEvent', 2, 1),
  ('first_id_camp_attended',   'real_world',  'Camp Played',       'Showed up and played in front of coaches.',                       'Soccer',        3, 2),
  ('first_visit_scheduled',    'real_world',  'Visit Scheduled',   'Moved a school into the visiting stage.',                         'MapPin',        3, 3),
  ('first_offer',              'real_world',  'Offer Received',    'Got a real offer — milestone moment.',                            'Trophy',        4, 4),
  ('streak_7',                 'engagement',  '7-Day Streak',      'Used the platform 7 days in a row.',                              'Flame',         1, 1),
  ('streak_30',                'engagement',  '30-Day Streak',     'Used the platform 30 days in a row.',                             'Flame',         2, 2),
  ('streak_100',               'engagement',  '100-Day Streak',    'Hundred straight days. Elite recruiting habit.',                  'Flame',         3, 3),
  ('first_month_active',       'engagement',  '30 Days In',        'Thirty days since you signed up.',                                'Calendar',      1, 4),
  ('first_highlight_uploaded', 'production',  'First Highlight',   'Uploaded your first video clip.',                                 'Video',         1, 1),
  ('three_highlights',         'production',  '3 Highlights',      'Built up a real video portfolio with 3 clips.',                   'Films',         2, 2),
  ('ten_highlights',           'production',  '10 Highlights',     'Ten clips uploaded — a real recruiting reel.',                    'PlayCircle',    3, 3),
  ('first_reel_built',         'production',  'Reel Built',        'Assembled your first highlight reel from your clips.',           'Sparkles',      3, 4),
  ('first_share_public',       'production',  'Profile Shared',    'Shared your recruiting profile URL with someone.',                'Share',         1, 5)
ON CONFLICT (id) DO UPDATE SET
  tier        = EXCLUDED.tier,
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  icon        = EXCLUDED.icon,
  points      = EXCLUDED.points,
  sort_order  = EXCLUDED.sort_order;
