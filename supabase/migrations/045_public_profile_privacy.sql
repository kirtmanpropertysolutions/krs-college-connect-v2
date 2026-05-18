-- 045_public_profile_privacy.sql
--
-- ⚠️  SUPERSEDED — DO NOT APPLY THIS FILE.
--
-- This migration was the first attempt at locking down the public
-- /p/{id} profile against leaking minor-athlete data. It was wrong.
--
-- It created `public_athlete_profiles` and `public_athlete_milestones`
-- SECURITY INVOKER views and, to make those views resolve for anon,
-- added `USING (true)` SELECT policies on profiles, athletes,
-- highlights, and athlete_milestones. RLS only filters rows — it does
-- not restrict columns — so any anon caller could bypass the view
-- with `.from('athletes').select('*').eq('user_id', X)` and pull GPA,
-- SAT, ACT, height, weight, intended major, and every other column.
--
-- The correct approach is in **048_public_profile_rpcs.sql**: anon
-- has no direct SELECT on the sensitive base tables; the public
-- profile reads through SECURITY DEFINER RPC functions that
-- explicitly enumerate the allowed columns. 048 also reverses the
-- broken policies and views from this file in case 045 was applied
-- before the fix landed.
--
-- This file is intentionally left as a no-op (an empty DO block) so
-- the migration ordering stays contiguous and a fresh `supabase db
-- reset` produces the same end state as a partial-history environment.
-- New deployments and existing deployments alike should rely on 048.

DO $$
BEGIN
  RAISE NOTICE
    '045_public_profile_privacy.sql is intentionally a no-op. '
    'The public profile privacy model lives in 048_public_profile_rpcs.sql.';
END $$;
