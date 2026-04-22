-- Create schools and coaches tables
-- Migration 012: Schools and Coaches

-- Table 1: schools (shared data for Coach Finder, School Fit Quiz, My Schools)
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  short_name text,
  division text CHECK (division IN ('D1', 'D2', 'D3', 'NAIA', 'JUCO')),
  conference text,
  state text,
  city text,
  region text CHECK (region IN ('Pacific Northwest', 'California', 'Southwest', 'Mountain West', 'Midwest', 'Northeast', 'Southeast', 'Mid-Atlantic', 'Ivy League')),
  primary_color text,
  secondary_color text,
  athletics_website text,
  email_domain text,
  enrollment int,
  academic_rank int,
  created_at timestamptz DEFAULT now()
);

-- Table 2: Handle existing coaches table or create new one
-- Drop and recreate coaches table if it exists with wrong schema
DROP TABLE IF EXISTS coaches CASCADE;

CREATE TABLE coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  email text,
  phone text,
  created_by uuid REFERENCES auth.users(id),
  org_id uuid REFERENCES organizations(id),
  visibility text CHECK (visibility IN ('private', 'club', 'shared')) DEFAULT 'private',
  verified_at timestamptz,
  flagged_as_stale boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_schools_division ON schools (division);
CREATE INDEX IF NOT EXISTS idx_schools_conference ON schools (conference);
CREATE INDEX IF NOT EXISTS idx_schools_region ON schools (region);
CREATE INDEX IF NOT EXISTS idx_schools_state ON schools (state);
CREATE INDEX IF NOT EXISTS idx_coaches_school ON coaches (school_id);
CREATE INDEX IF NOT EXISTS idx_coaches_org ON coaches (org_id);
CREATE INDEX IF NOT EXISTS idx_coaches_visibility ON coaches (visibility);

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schools
-- Anyone authenticated can SELECT schools
DROP POLICY IF EXISTS "Authenticated users can view schools" ON schools;
CREATE POLICY "Authenticated users can view schools"
  ON schools FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can INSERT/UPDATE/DELETE schools
-- (These policies would be enforced by server-side API routes with proper admin checks)
DROP POLICY IF EXISTS "Admins can manage schools" ON schools;
CREATE POLICY "Admins can manage schools"
  ON schools FOR ALL
  TO authenticated
  USING (false)  -- Managed via server-side API routes only
  WITH CHECK (false);

-- RLS Policies for coaches
-- SELECT: visibility='shared' OR (visibility='club' AND user belongs to same org) OR created_by=auth.uid()
DROP POLICY IF EXISTS "Users can view accessible coaches" ON coaches;
CREATE POLICY "Users can view accessible coaches"
  ON coaches FOR SELECT
  TO authenticated
  USING (
    visibility = 'shared'
    OR created_by = auth.uid()
    OR (
      visibility = 'club'
      AND org_id IN (
        SELECT om.org_id
        FROM org_members om
        WHERE om.user_id = auth.uid()
      )
    )
  );

-- INSERT: authenticated users can add coaches they created
DROP POLICY IF EXISTS "Users can add coaches" ON coaches;
CREATE POLICY "Users can add coaches"
  ON coaches FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- UPDATE/DELETE: created_by=auth.uid() OR user is admin of coaches.org_id
DROP POLICY IF EXISTS "Users can modify own coaches or admin org coaches" ON coaches;
CREATE POLICY "Users can modify own coaches or admin org coaches"
  ON coaches FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (
      org_id IN (
        SELECT om.org_id
        FROM org_members om
        WHERE om.user_id = auth.uid()
        AND om.role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own coaches or admin org coaches" ON coaches;
CREATE POLICY "Users can delete own coaches or admin org coaches"
  ON coaches FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (
      org_id IN (
        SELECT om.org_id
        FROM org_members om
        WHERE om.user_id = auth.uid()
        AND om.role = 'admin'
      )
    )
  );