-- Pipeline Stage Constraint
-- Migration 022: Add CHECK constraint to prevent invalid stage values

-- Drop existing constraint if it exists
ALTER TABLE pipelines DROP CONSTRAINT IF EXISTS pipelines_stage_check;

-- Add new constraint to ensure only valid stage values
ALTER TABLE pipelines ADD CONSTRAINT pipelines_stage_check
  CHECK (stage IN ('interested', 'contacted', 'visiting', 'offer', 'committed'));

-- Add comment for documentation
COMMENT ON CONSTRAINT pipelines_stage_check ON pipelines IS 'Ensures stage column contains only valid pipeline stage values';