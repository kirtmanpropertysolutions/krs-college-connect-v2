-- Fix pipeline stages constraint to match UI
-- The UI uses the 'stage' column with: interested, contacted, visiting, offer, committed
-- Ensure the constraint is properly in place

-- Drop any old constraint on status column that might interfere
ALTER TABLE pipelines DROP CONSTRAINT IF EXISTS pipelines_status_check;

-- Ensure the stage column constraint exists (should be from migration 022)
ALTER TABLE pipelines DROP CONSTRAINT IF EXISTS pipelines_stage_check;
ALTER TABLE pipelines ADD CONSTRAINT pipelines_stage_check
CHECK (stage IN ('interested', 'contacted', 'visiting', 'offer', 'committed'));

-- Make sure stage column has proper default
UPDATE pipelines SET stage = 'interested' WHERE stage IS NULL;
ALTER TABLE pipelines ALTER COLUMN stage SET DEFAULT 'interested';