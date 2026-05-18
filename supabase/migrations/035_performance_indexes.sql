-- ============================================================
-- 035_performance_indexes.sql
-- Performance indexes for scale: 3,000 athletes × 150 clubs.
-- Safe to re-run — every statement uses IF NOT EXISTS.
--
-- Note: Many single-column indexes already exist from earlier
-- migrations (001–034). This file adds only the gaps:
-- missing single-column indexes and composite indexes for
-- the most common multi-column filter patterns.
-- ============================================================

-- ─────────────────────────────────────────────
-- athletes
-- (user_id, org_id already indexed in 004)
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_athletes_position
  ON athletes (position);

CREATE INDEX IF NOT EXISTS idx_athletes_class_year
  ON athletes (class_year);

-- Composite: org roster filtered by grad year (admin view)
CREATE INDEX IF NOT EXISTS idx_athletes_org_class_year
  ON athletes (org_id, class_year);

-- Composite: org roster filtered by position (admin view)
CREATE INDEX IF NOT EXISTS idx_athletes_org_position
  ON athletes (org_id, position);

-- ─────────────────────────────────────────────
-- profiles
-- (org_id already indexed in 003)
-- profiles.id IS the auth user_id — no extra index needed.
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- pipelines
-- (athlete_id, org_id already indexed in 006)
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pipelines_status
  ON pipelines (status);

-- Composite: athlete's schools by stage (My Schools page)
CREATE INDEX IF NOT EXISTS idx_pipelines_athlete_status
  ON pipelines (athlete_id, status);

-- Composite: admin view — all pipelines for an org, by stage
CREATE INDEX IF NOT EXISTS idx_pipelines_org_status
  ON pipelines (org_id, status);

-- ─────────────────────────────────────────────
-- schools
-- (division, conference, region, state already indexed in 012)
-- ─────────────────────────────────────────────

-- Text search on school name (LIKE 'term%' queries use this)
CREATE INDEX IF NOT EXISTS idx_schools_name
  ON schools (name);

-- Composite: Coach Finder filters by division + conference
CREATE INDEX IF NOT EXISTS idx_schools_division_conference
  ON schools (division, conference);

-- ─────────────────────────────────────────────
-- coaches
-- (school_id, org_id, visibility already indexed in 012)
-- ─────────────────────────────────────────────

-- Composite: coaches for a school visible to a given org
CREATE INDEX IF NOT EXISTS idx_coaches_school_visibility
  ON coaches (school_id, visibility);

-- ─────────────────────────────────────────────
-- highlight_videos
-- (athlete_id, reel_order composite already indexed in 034)
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_highlight_videos_status
  ON highlight_videos (status);

-- Composite: athlete's ready clips (public profile reel)
CREATE INDEX IF NOT EXISTS idx_highlight_videos_athlete_status
  ON highlight_videos (athlete_id, status);

-- ─────────────────────────────────────────────
-- org_nil_deals
-- (org_id, status already indexed in 032)
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_org_nil_deals_expiration_date
  ON org_nil_deals (expiration_date);

-- Composite: org's open deals (athlete NIL Deals page)
CREATE INDEX IF NOT EXISTS idx_org_nil_deals_org_status
  ON org_nil_deals (org_id, status);

-- ─────────────────────────────────────────────
-- org_members
-- (user_id, org_id already indexed in 002)
-- ─────────────────────────────────────────────

-- Composite: find all admins (or athletes) in a given org
CREATE INDEX IF NOT EXISTS idx_org_members_org_role
  ON org_members (org_id, role);

-- ─────────────────────────────────────────────
-- Update query planner statistics
-- ─────────────────────────────────────────────
ANALYZE athletes;
ANALYZE profiles;
ANALYZE pipelines;
ANALYZE schools;
ANALYZE coaches;
ANALYZE highlight_videos;
ANALYZE org_nil_deals;
ANALYZE org_members;
