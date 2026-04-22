-- School Fit Quiz schema
-- Migration 015: School Fit Quiz

-- Create school_fit_quiz_responses table
CREATE TABLE IF NOT EXISTS school_fit_quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  school_size text CHECK (school_size IN ('small', 'medium', 'large', 'no_preference')),
  distance_from_home text CHECK (distance_from_home IN ('driving_distance', 'same_region', 'anywhere')),
  academic_priority text CHECK (academic_priority IN ('ivy_tier', 'strong_academic', 'balanced', 'soccer_first')),
  division_target text CHECK (division_target IN ('d1_only', 'd1_d2', 'd2_d3', 'all_divisions')),
  playing_time text CHECK (playing_time IN ('start_freshman', 'bench_contributor', 'develop_four_years', 'happy_anywhere')),
  cost_sensitivity text CHECK (cost_sensitivity IN ('significant_aid_needed', 'some_aid', 'not_a_concern')),
  campus_culture text CHECK (campus_culture IN ('rah_rah_sports', 'academic_focused', 'artsy_creative', 'diverse_inclusive', 'chill_low_key')),
  coach_relationship_priority text CHECK (coach_relationship_priority IN ('high_trust', 'developmental', 'balanced', 'results_focused')),
  program_prestige text CHECK (program_prestige IN ('top_25', 'top_50', 'competitive_in_conference', 'any_program')),
  support_services_priority text CHECK (support_services_priority IN ('strong_academic_support', 'sports_psych', 'dietitian_medical', 'less_critical')),
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE school_fit_quiz_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own quiz responses
DROP POLICY IF EXISTS "Users read own quiz responses" ON school_fit_quiz_responses;
CREATE POLICY "Users read own quiz responses"
  ON school_fit_quiz_responses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own quiz responses" ON school_fit_quiz_responses;
CREATE POLICY "Users insert own quiz responses"
  ON school_fit_quiz_responses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own quiz responses" ON school_fit_quiz_responses;
CREATE POLICY "Users update own quiz responses"
  ON school_fit_quiz_responses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_school_fit_quiz_user ON school_fit_quiz_responses (user_id);