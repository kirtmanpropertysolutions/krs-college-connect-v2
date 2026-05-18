-- Recruiting Activity Log
-- Migration 023: Activity tracking for dashboard

CREATE TABLE IF NOT EXISTS recruiting_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruiting_activity_athlete_date
  ON recruiting_activity (athlete_id, created_at DESC);

ALTER TABLE recruiting_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athletes see own activity"
  ON recruiting_activity FOR SELECT
  USING (athlete_id = auth.uid());

CREATE POLICY "athletes write own activity"
  ON recruiting_activity FOR INSERT
  WITH CHECK (athlete_id = auth.uid());

-- Add comment for documentation
COMMENT ON TABLE recruiting_activity IS 'Activity log for recruiting dashboard';
COMMENT ON COLUMN recruiting_activity.activity_type IS 'Valid types: school_added, school_removed, stage_changed, note_saved, email_sent, quiz_completed, profile_updated, school_viewed';