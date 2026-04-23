-- Add unique constraint on coaches table for upsert operations
-- Migration 018: Coaches Unique Constraint

-- Add unique constraint on (school_id, name) if it doesn't already exist
-- This is needed for the scraper's onConflict: 'school_id,name' parameter

DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'coaches_school_name_unique'
    ) THEN
        -- Add the unique constraint
        ALTER TABLE coaches
        ADD CONSTRAINT coaches_school_name_unique
        UNIQUE (school_id, name);

        RAISE NOTICE 'Added unique constraint on coaches(school_id, name)';
    ELSE
        RAISE NOTICE 'Unique constraint on coaches(school_id, name) already exists';
    END IF;
END $$;