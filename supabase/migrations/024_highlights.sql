-- Highlights Management
-- Migration 024: Add highlights table for video management

CREATE TABLE IF NOT EXISTS highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  recorded_date DATE,
  source TEXT,                          -- 'hudl', 'youtube', 'trace', 'veo', 'instagram', 'tiktok', 'other'
  thumbnail_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_highlights_athlete ON highlights (athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_highlights_primary ON highlights (athlete_id, is_primary) WHERE is_primary = true;

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athletes manage own highlights"
  ON highlights FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Ensure only one primary highlight per athlete (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_highlights_one_primary
  ON highlights (athlete_id) WHERE is_primary = true;

-- Add comment for documentation
COMMENT ON TABLE highlights IS 'Video highlights and reels managed by athletes - primary highlight flows into recruiting templates';