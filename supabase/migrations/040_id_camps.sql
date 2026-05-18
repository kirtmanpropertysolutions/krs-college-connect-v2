-- 040_id_camps.sql
-- Director-curated ID camp catalog. Each row is a camp the club's
-- director has recommended to their athletes. Org-scoped — every
-- club maintains its own list.
CREATE TABLE IF NOT EXISTS id_camps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  school_id         uuid REFERENCES schools(id) ON DELETE SET NULL,
  school_name       text NOT NULL,
  name              text NOT NULL,
  start_date        date NOT NULL,
  end_date          date,
  location          text,
  cost              integer,
  registration_url  text,
  description       text,
  featured          boolean NOT NULL DEFAULT false,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS id_camps_org_idx        ON id_camps (org_id);
CREATE INDEX IF NOT EXISTS id_camps_start_date_idx ON id_camps (start_date);

ALTER TABLE id_camps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read id_camps" ON id_camps;
CREATE POLICY "Org members read id_camps"
  ON id_camps FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage id_camps" ON id_camps;
CREATE POLICY "Admins manage id_camps"
  ON id_camps FOR ALL TO authenticated
  USING (
    org_id IN (SELECT org_id FROM org_members
               WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    org_id IN (SELECT org_id FROM org_members
               WHERE user_id = auth.uid() AND role = 'admin')
  );

ALTER TABLE scheduled_camps
  ADD COLUMN IF NOT EXISTS id_camp_id uuid REFERENCES id_camps(id) ON DELETE SET NULL;
