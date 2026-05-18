-- Migration 029: Add school brand colors to recruiting_camps_archived table

ALTER TABLE recruiting_camps_archived
  ADD COLUMN IF NOT EXISTS primary_color TEXT,
  ADD COLUMN IF NOT EXISTS secondary_color TEXT;

-- Index for faster school color lookups
CREATE INDEX IF NOT EXISTS idx_recruiting_camps_archived_school_name
  ON recruiting_camps_archived (school_name);