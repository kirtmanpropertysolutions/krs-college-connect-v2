-- ID Camps System
-- Migration 027: Replace camp planner with manual camp calendar

-- Archive old recruiting camps and remove camp plans
ALTER TABLE recruiting_camps RENAME TO recruiting_camps_archived;
DROP TABLE IF EXISTS camp_plans;

-- Create new scheduled camps table for manual tracking
CREATE TABLE IF NOT EXISTS scheduled_camps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camp_date DATE NOT NULL,
  school_name TEXT NOT NULL,
  cost INT,
  registration_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_camps_athlete_date ON scheduled_camps (athlete_id, camp_date);

ALTER TABLE scheduled_camps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athletes manage own scheduled camps"
  ON scheduled_camps FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());