-- 046_performance_indexes.sql
-- Indexes on every FK column hit on every page load. Rows are
-- still small enough that seq scans don't bite, but at 100+
-- athletes per club they will.
CREATE INDEX IF NOT EXISTS idx_pipelines_athlete_id        ON pipelines        (athlete_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_athlete_updated   ON pipelines        (athlete_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_athlete_id         ON outreach         (athlete_id);
CREATE INDEX IF NOT EXISTS idx_outreach_athlete_sent_at    ON outreach         (athlete_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_recruiting_activity_athlete ON recruiting_activity (athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_highlights_athlete_id       ON highlights       (athlete_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_camps_athlete     ON scheduled_camps  (athlete_id, camp_date);
CREATE INDEX IF NOT EXISTS idx_athlete_milestones_user     ON athlete_milestones (user_id);
CREATE INDEX IF NOT EXISTS idx_athlete_milestones_org      ON athlete_milestones (org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_role           ON profiles         (org_id, role);
CREATE INDEX IF NOT EXISTS idx_org_members_user            ON org_members      (user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_role        ON org_members      (org_id, role);
CREATE INDEX IF NOT EXISTS idx_invite_codes_org_active     ON invite_codes     (org_id, active);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code           ON invite_codes     (code) WHERE active;
CREATE INDEX IF NOT EXISTS idx_coaches_school              ON coaches          (school_id);
CREATE INDEX IF NOT EXISTS idx_schools_name                ON schools          (name);
CREATE INDEX IF NOT EXISTS idx_school_notes_user_school    ON school_notes     (user_id, school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_org_created   ON announcements    (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_id_camps_org_date           ON id_camps         (org_id, start_date);
