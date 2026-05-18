-- School Notes
-- Migration 020: School Notes Table

-- Create school_notes table for athlete notes about schools
CREATE TABLE IF NOT EXISTS school_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  notes text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, school_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_school_notes_user ON school_notes (user_id);
CREATE INDEX IF NOT EXISTS idx_school_notes_school ON school_notes (school_id);
CREATE INDEX IF NOT EXISTS idx_school_notes_updated ON school_notes (updated_at);

-- Enable RLS
ALTER TABLE school_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only access their own notes
DROP POLICY IF EXISTS "Users manage own school notes" ON school_notes;
CREATE POLICY "Users manage own school notes"
  ON school_notes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add comment for documentation
COMMENT ON TABLE school_notes IS 'Private notes that athletes can add about schools during their recruiting process';
COMMENT ON COLUMN school_notes.user_id IS 'The athlete who owns these notes';
COMMENT ON COLUMN school_notes.school_id IS 'The school these notes are about';