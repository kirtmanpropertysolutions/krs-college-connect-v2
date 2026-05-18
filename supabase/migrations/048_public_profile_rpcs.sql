-- 048_public_profile_rpcs.sql
--
-- Phase 2 corrigendum — replaces the public-profile privacy approach
-- introduced in 045_public_profile_privacy.sql.
--
-- WHY 045 WAS BROKEN
-- ------------------
-- 045 created `public_athlete_profiles` and `public_athlete_milestones`
-- SECURITY INVOKER views. Under SECURITY INVOKER the view executes with
-- the privileges of the caller, so for `anon` to read through the view
-- the underlying base tables had to allow anon SELECT. 045 did this by
-- adding `USING (true)` RLS policies on profiles, athletes, highlights,
-- and athlete_milestones.
--
-- That is a column-leak: RLS only filters rows, never columns. An anon
-- caller could ignore the view entirely and run
--   .from('athletes').select('*').eq('user_id', X)
-- to retrieve GPA, SAT, ACT, height_cm, weight, intended_major, plus
-- every other column the view was supposed to hide. Because these are
-- minor athletes, that's a privacy incident, not a policy bug.
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
-- 1. Drops the `USING (true)` policies and the SECURITY INVOKER views
--    from 045.
-- 2. Belt-and-suspenders REVOKE: removes direct anon SELECT on the
--    sensitive base tables (profiles, athletes, pipelines, outreach,
--    highlights, highlight_videos, athlete_milestones, school_notes,
--    recruiting_activity, scheduled_camps, camp_expenses).
--    PostgREST grants these to anon by default; without an explicit
--    REVOKE, a future migration that accidentally adds a permissive
--    policy would reopen the hole. With the GRANT itself gone, anon
--    physically cannot read these tables — RLS is no longer the only
--    line of defense.
-- 3. Creates four SECURITY DEFINER RPC functions for the public
--    profile page. Each function explicitly enumerates the columns it
--    returns — there is no SELECT * and no path for the caller to ask
--    for more than the function's declared TABLE() type.
--      * get_public_athlete_profile(p_profile_id uuid)
--      * get_public_athlete_highlights(p_athlete_id uuid)
--      * get_public_athlete_primary_highlight(p_athlete_id uuid)
--      * get_public_athlete_milestones(p_athlete_id uuid)
-- 4. EXECUTE is granted only to anon + authenticated. All other roles
--    must use the base tables under their normal RLS.
--
-- WHY THIS CANNOT LEAK PRIVATE DATA
-- ---------------------------------
-- * anon has no direct SELECT grant on profiles / athletes / pipelines /
--   outreach / highlights / highlight_videos / athlete_milestones /
--   school_notes / recruiting_activity / scheduled_camps / camp_expenses.
--   Asking PostgREST for `from('athletes')` now returns 401, not data.
-- * The RPC functions run as the function owner with `SECURITY DEFINER`
--   so they can read the base tables, but each function body lists the
--   exact column projection. Height (height_cm), GPA, SAT, ACT, weight,
--   intended major, pipeline strategy, outreach, recruiting activity,
--   and private notes appear in zero function bodies. Adding them
--   would require an explicit code change in this file.
-- * search_path is locked to `public, pg_temp` so a malicious schema
--   shim cannot intercept the function's table references.
-- * Highlights are filtered to status='ready' AND reel_order > 0 inside
--   the function, so half-uploaded clips and clips the athlete has not
--   added to the reel are never returned.
-- * The functions are STABLE (no writes) and operate on a single
--   athlete_id argument, so the read is cacheable at the CDN edge.

-- ── 1. Reverse the broken policies and views from 045 ──────────────
DROP POLICY IF EXISTS "Public minimal profile fields"             ON profiles;
DROP POLICY IF EXISTS "Public minimal athlete fields"             ON athletes;
DROP POLICY IF EXISTS "Public read highlights"                    ON highlights;
DROP POLICY IF EXISTS "Public read athlete milestones for profile" ON athlete_milestones;

DROP VIEW IF EXISTS public.public_athlete_profiles;
DROP VIEW IF EXISTS public.public_athlete_milestones;

-- ── 2. Revoke direct anon SELECT on sensitive base tables ──────────
-- Idempotent: REVOKE on a grant that doesn't exist is a no-op.
-- authenticated keeps its SELECT grant; per-row RLS continues to
-- enforce ownership/org-membership for logged-in users.
REVOKE SELECT ON public.profiles            FROM anon;
REVOKE SELECT ON public.athletes            FROM anon;
REVOKE SELECT ON public.pipelines           FROM anon;
REVOKE SELECT ON public.outreach            FROM anon;
REVOKE SELECT ON public.highlights          FROM anon;
REVOKE SELECT ON public.highlight_videos    FROM anon;
REVOKE SELECT ON public.athlete_milestones  FROM anon;
REVOKE SELECT ON public.school_notes        FROM anon;
REVOKE SELECT ON public.recruiting_activity FROM anon;

-- Best-effort revokes on tables that exist conditionally (no-op if
-- the table is absent in a particular environment).
DO $$
BEGIN
  IF to_regclass('public.scheduled_camps') IS NOT NULL THEN
    EXECUTE 'REVOKE SELECT ON public.scheduled_camps FROM anon';
  END IF;
  IF to_regclass('public.camp_expenses') IS NOT NULL THEN
    EXECUTE 'REVOKE SELECT ON public.camp_expenses FROM anon';
  END IF;
END $$;

-- organizations stays anon-readable: it holds only org branding
-- (name, slug, colors, logo_url) and is needed by the signup page to
-- show "you're joining Eastside FC" before the user has a session.
-- No private data lives in this table.

-- ── 3. SECURITY DEFINER RPC: athlete profile + org branding ────────
-- Returns the single profile + joined org branding. Columns are an
-- explicit allow-list — every field here was reviewed against the
-- "minors privacy" exclusion list. Not present: height_cm, gpa, sat,
-- act, weight, intended_major, club_team_division, gpa_unweighted,
-- recruiting_status, any pipeline / outreach / notes fields.

-- Note: `position` is a SQL reserved word — Postgres rejects it as a
-- bare identifier in the RETURNS TABLE clause even though it's fine
-- as a column reference in SELECT. Double-quoting preserves the
-- column name as `position` for PostgREST consumers.
CREATE OR REPLACE FUNCTION public.get_public_athlete_profile(p_profile_id uuid)
RETURNS TABLE (
  id                     uuid,
  full_name              text,
  "position"             text,
  class_year             integer,
  jersey_number          integer,
  dominant_foot          text,
  club_team              text,
  high_school            text,
  city                   text,
  state                  text,
  bio                    text,
  profile_photo_url      text,
  instagram_url          text,
  twitter_url            text,
  tiktok_url             text,
  youtube_url            text,
  hudl_url               text,
  youtube_highlights_url text,
  veo_link_url           text,
  highlight_reel_url     text,
  org_id                 uuid,
  org_name               text,
  org_slug               text,
  org_primary_color      text,
  org_secondary_color    text,
  org_logo_url           text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id,
    p.full_name,
    a.position,
    a.class_year,
    a.jersey_number,
    a.dominant_foot,
    a.club_team,
    a.high_school,
    a.city,
    a.state,
    a.bio,
    a.profile_photo_url,
    a.instagram_url,
    a.twitter_url,
    a.tiktok_url,
    a.youtube_url,
    a.hudl_url,
    a.youtube_highlights_url,
    a.veo_link_url,
    a.highlight_reel_url,
    p.org_id,
    o.name,
    o.slug,
    o.primary_color,
    o.secondary_color,
    o.logo_url
  FROM public.profiles p
  LEFT JOIN public.athletes      a ON a.user_id = p.id
  LEFT JOIN public.organizations o ON o.id      = p.org_id
  WHERE p.id   = p_profile_id
    AND p.role = 'athlete';
$$;

REVOKE ALL ON FUNCTION public.get_public_athlete_profile(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_public_athlete_profile(uuid) TO anon, authenticated;

-- ── 4. SECURITY DEFINER RPC: published highlight reel ──────────────
-- Returns only Mux clips with status='ready' AND reel_order > 0
-- (i.e. clips the athlete has explicitly added to their reel). Storage
-- paths, upload tokens, and any internal Mux asset metadata stay
-- internal — the projection here is exactly what the public player
-- needs and nothing more.

CREATE OR REPLACE FUNCTION public.get_public_athlete_highlights(p_athlete_id uuid)
RETURNS TABLE (
  id               uuid,
  mux_playback_id  text,
  title            text,
  start_time       numeric,
  end_time         numeric,
  duration         numeric,
  overlay_name     text,
  overlay_position text,
  overlay_jersey   text,
  reel_order       integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    hv.id,
    hv.mux_playback_id,
    hv.title,
    hv.start_time,
    hv.end_time,
    hv.duration,
    hv.overlay_name,
    hv.overlay_position,
    hv.overlay_jersey,
    hv.reel_order
  FROM public.highlight_videos hv
  WHERE hv.athlete_id = p_athlete_id
    AND hv.status     = 'ready'
    AND hv.reel_order IS NOT NULL
    AND hv.reel_order > 0
  ORDER BY hv.reel_order ASC
  LIMIT 10;
$$;

REVOKE ALL ON FUNCTION public.get_public_athlete_highlights(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_public_athlete_highlights(uuid) TO anon, authenticated;

-- ── 5. SECURITY DEFINER RPC: legacy primary highlight fallback ─────
-- The legacy `highlights` table is the pre-Mux YouTube/Hudl link
-- fallback. Only `is_primary = true` rows are exposed. URLs, titles,
-- source, and thumbnail are the only columns the public player needs.

CREATE OR REPLACE FUNCTION public.get_public_athlete_primary_highlight(p_athlete_id uuid)
RETURNS TABLE (
  url           text,
  title         text,
  source        text,
  thumbnail_url text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT h.url, h.title, h.source, h.thumbnail_url
  FROM public.highlights h
  WHERE h.athlete_id = p_athlete_id
    AND h.is_primary = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_athlete_primary_highlight(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_public_athlete_primary_highlight(uuid) TO anon, authenticated;

-- ── 6. SECURITY DEFINER RPC: earned badges (milestones) ────────────
-- Returns only the milestone_id + earned_at pair. The athlete_milestones
-- table also holds org_id and internal metadata; those stay private.
-- The frontend resolves milestone_id -> name/icon from a static
-- milestones definition that's already public in the bundle.

CREATE OR REPLACE FUNCTION public.get_public_athlete_milestones(p_athlete_id uuid)
RETURNS TABLE (
  milestone_id text,
  earned_at    timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT am.milestone_id, am.earned_at
  FROM public.athlete_milestones am
  WHERE am.user_id = p_athlete_id
  ORDER BY am.earned_at DESC
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.get_public_athlete_milestones(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_public_athlete_milestones(uuid) TO anon, authenticated;
