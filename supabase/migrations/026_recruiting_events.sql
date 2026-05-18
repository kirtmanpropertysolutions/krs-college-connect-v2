-- Recruiting Events System
-- Migration 026: Add recruiting camps and camp plans tables

CREATE TABLE IF NOT EXISTS recruiting_camps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  conference TEXT,
  ranking INT,
  athletics_url TEXT NOT NULL,
  estimated_cost INT,
  is_top_100 BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruiting_camps_ranking ON recruiting_camps (ranking);

CREATE TABLE IF NOT EXISTS camp_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_amount INT NOT NULL,
  selected_schools JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_estimated_cost INT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_camp_plans_athlete ON camp_plans (athlete_id, created_at DESC);

ALTER TABLE recruiting_camps ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can view recruiting camps"
  ON recruiting_camps FOR SELECT USING (true);

CREATE POLICY "athletes manage own camp plans"
  ON camp_plans FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());