-- 044_security_hardening_with_check.sql
-- CRITICAL FIX: every athlete-scoped INSERT policy was missing a
-- WITH CHECK clause. Without it, RLS lets authenticated users
-- INSERT rows pretending to be another user (impersonation +
-- spam). USING gates SELECT/UPDATE/DELETE. WITH CHECK gates
-- INSERT and the new state of UPDATE.

-- athletes
DROP POLICY IF EXISTS "Athletes insert own data" ON athletes;
CREATE POLICY "Athletes insert own data" ON athletes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Athletes update own data" ON athletes;
CREATE POLICY "Athletes update own data" ON athletes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- pipelines
DROP POLICY IF EXISTS "Athletes insert own pipelines" ON pipelines;
CREATE POLICY "Athletes insert own pipelines" ON pipelines FOR INSERT TO authenticated
  WITH CHECK (athlete_id = auth.uid());
DROP POLICY IF EXISTS "Athletes update own pipelines" ON pipelines;
CREATE POLICY "Athletes update own pipelines" ON pipelines FOR UPDATE TO authenticated
  USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());

-- outreach
DROP POLICY IF EXISTS "Athletes insert own outreach" ON outreach;
CREATE POLICY "Athletes insert own outreach" ON outreach FOR INSERT TO authenticated
  WITH CHECK (athlete_id = auth.uid());
DROP POLICY IF EXISTS "Athletes update own outreach" ON outreach;
CREATE POLICY "Athletes update own outreach" ON outreach FOR UPDATE TO authenticated
  USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());

-- recruiting_activity
DROP POLICY IF EXISTS "athletes write own activity" ON recruiting_activity;
CREATE POLICY "athletes write own activity" ON recruiting_activity FOR INSERT TO authenticated
  WITH CHECK (athlete_id = auth.uid());

-- events_saved
DROP POLICY IF EXISTS "Athletes insert own events_saved" ON events_saved;
CREATE POLICY "Athletes insert own events_saved" ON events_saved FOR INSERT TO authenticated
  WITH CHECK (athlete_id = auth.uid());
DROP POLICY IF EXISTS "Athletes update own events_saved" ON events_saved;
CREATE POLICY "Athletes update own events_saved" ON events_saved FOR UPDATE TO authenticated
  USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());

-- nil_deals (athlete-scoped legacy table — admin-facing org_nil_deals is separate)
DROP POLICY IF EXISTS "Athletes insert own nil_deals" ON nil_deals;
CREATE POLICY "Athletes insert own nil_deals" ON nil_deals FOR INSERT TO authenticated
  WITH CHECK (athlete_id = auth.uid());
DROP POLICY IF EXISTS "Athletes update own nil_deals" ON nil_deals;
CREATE POLICY "Athletes update own nil_deals" ON nil_deals FOR UPDATE TO authenticated
  USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());

-- social_posts
DROP POLICY IF EXISTS "Athletes insert own social_posts" ON social_posts;
CREATE POLICY "Athletes insert own social_posts" ON social_posts FOR INSERT TO authenticated
  WITH CHECK (athlete_id = auth.uid());
DROP POLICY IF EXISTS "Athletes update own social_posts" ON social_posts;
CREATE POLICY "Athletes update own social_posts" ON social_posts FOR UPDATE TO authenticated
  USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());

-- clips
DROP POLICY IF EXISTS "Athletes insert own clips" ON clips;
CREATE POLICY "Athletes insert own clips" ON clips FOR INSERT TO authenticated
  WITH CHECK (athlete_id = auth.uid());
DROP POLICY IF EXISTS "Athletes update own clips" ON clips;
CREATE POLICY "Athletes update own clips" ON clips FOR UPDATE TO authenticated
  USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());

-- profiles
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- invite_codes — admins INSERT only for THEIR org
DROP POLICY IF EXISTS "Admins create org invite codes" ON invite_codes;
CREATE POLICY "Admins create org invite codes" ON invite_codes FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (SELECT org_id FROM org_members
               WHERE user_id = auth.uid() AND role = 'admin')
  );

-- school_fit_quiz_responses
DROP POLICY IF EXISTS "Users insert own quiz responses" ON school_fit_quiz_responses;
CREATE POLICY "Users insert own quiz responses" ON school_fit_quiz_responses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own quiz responses" ON school_fit_quiz_responses;
CREATE POLICY "Users update own quiz responses" ON school_fit_quiz_responses FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- athlete_milestones
DROP POLICY IF EXISTS "Users insert own milestones" ON athlete_milestones;
CREATE POLICY "Users insert own milestones" ON athlete_milestones FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- school_fit_quiz (legacy athlete-scoped quiz table)
DROP POLICY IF EXISTS "Athletes insert own quiz" ON school_fit_quiz;
CREATE POLICY "Athletes insert own quiz" ON school_fit_quiz FOR INSERT TO authenticated
  WITH CHECK (athlete_id = auth.uid());
DROP POLICY IF EXISTS "Athletes update own quiz" ON school_fit_quiz;
CREATE POLICY "Athletes update own quiz" ON school_fit_quiz FOR UPDATE TO authenticated
  USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());

-- Cleanup redundant schools policies
DROP POLICY IF EXISTS "Authenticated users can view schools" ON schools;
DROP POLICY IF EXISTS "Admins can manage schools" ON schools;
