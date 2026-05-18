-- Fix highlights table by removing org_id column
-- Migration 025: org_id is redundant since highlights are scoped by athlete_id
-- The org context is already implicit through the athlete relationship

ALTER TABLE highlights DROP COLUMN IF EXISTS org_id;