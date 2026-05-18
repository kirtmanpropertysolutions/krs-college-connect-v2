-- Pipeline Stages Enhancement
-- Migration 021: Pipeline Stages

-- Add stage tracking columns to pipelines table
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'interested';
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT now();
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMP DEFAULT now();

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_pipelines_user_stage ON pipelines (athlete_id, stage);

-- Update existing records to have stage if null
UPDATE pipelines SET stage = 'interested' WHERE stage IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN pipelines.stage IS 'Current stage: interested, contacted, visiting, offer, committed';
COMMENT ON COLUMN pipelines.last_activity_at IS 'Last time user interacted with this school';
COMMENT ON COLUMN pipelines.stage_updated_at IS 'When the stage was last changed';