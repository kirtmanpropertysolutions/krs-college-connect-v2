-- Outreach Tool Database Schema
-- Migration 019: Outreach Schema

-- Create outreach_log table for tracking all outreach activities
CREATE TABLE IF NOT EXISTS outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations(id),
  coach_id uuid REFERENCES coaches(id) ON DELETE SET NULL,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  template_type text CHECK (template_type IN ('initial', 'follow_up', 'highlight_share', 'campus_visit', 'thank_you_camp', 'schedule_update', 'custom')),
  subject text,
  body text,
  sent_method text CHECK (sent_method IN ('copied_to_clipboard', 'opened_mail_app', 'marked_sent_manually')),
  sent_at timestamptz DEFAULT now(),
  coach_replied boolean DEFAULT false,
  coach_reply_status text CHECK (coach_reply_status IN ('pending', 'positive', 'negative', 'no_reply')) DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create outreach_templates table for email templates
CREATE TABLE IF NOT EXISTS outreach_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type text CHECK (template_type IN ('initial', 'follow_up', 'highlight_share', 'campus_visit', 'thank_you_camp', 'schedule_update', 'custom')) NOT NULL,
  subject_template text NOT NULL,
  body_template text NOT NULL,
  org_id uuid REFERENCES organizations(id), -- NULL = system template
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_outreach_log_athlete ON outreach_log (athlete_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_org ON outreach_log (org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_coach ON outreach_log (coach_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_school ON outreach_log (school_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_sent_at ON outreach_log (sent_at);
CREATE INDEX IF NOT EXISTS idx_outreach_templates_org ON outreach_templates (org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_templates_type ON outreach_templates (template_type);

-- Enable RLS
ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for outreach_log
-- Athletes can SELECT/INSERT/UPDATE their own rows
DROP POLICY IF EXISTS "Athletes manage own outreach logs" ON outreach_log;
CREATE POLICY "Athletes manage own outreach logs"
  ON outreach_log FOR ALL
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Org admins can SELECT all rows for their org
DROP POLICY IF EXISTS "Org admins view org outreach logs" ON outreach_log;
CREATE POLICY "Org admins view org outreach logs"
  ON outreach_log FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT om.org_id
      FROM org_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- RLS Policies for outreach_templates
-- Anyone authenticated can SELECT system templates (org_id IS NULL) OR their org's templates
DROP POLICY IF EXISTS "Users view system and org templates" ON outreach_templates;
CREATE POLICY "Users view system and org templates"
  ON outreach_templates FOR SELECT
  TO authenticated
  USING (
    org_id IS NULL
    OR org_id IN (
      SELECT om.org_id
      FROM org_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Only org admins can INSERT/UPDATE org templates
DROP POLICY IF EXISTS "Org admins manage org templates" ON outreach_templates;
CREATE POLICY "Org admins manage org templates"
  ON outreach_templates FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT om.org_id
      FROM org_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT om.org_id
      FROM org_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- Seed system templates (visible to all organizations)
INSERT INTO outreach_templates (name, template_type, subject_template, body_template, org_id, created_by) VALUES

-- Template 1: Initial Outreach
('Initial Contact', 'initial',
'{{grad_year}} {{position}} | {{athlete_name}} | {{school_name}} Interest',
'Hi Coach {{coach_name}},

My name is {{athlete_name}}. I''m a {{grad_year}} {{position}} at {{high_school}} ({{city}}, {{state}}), currently playing club soccer for {{club_team}}.

I''m very interested in {{school_name}} for both academics and the soccer program. A few quick things about me:

- Position: {{position}}, jersey #{{jersey_number}}
- GPA: {{gpa}}
- Class of {{grad_year}}

Highlight reel: {{highlight_url}}
Trace profile: {{trace_url}}
Hudl profile: {{hudl_url}}

I''d love to stay in touch as my recruiting process develops. Happy to send additional film, stats, or schedule information whenever it''s helpful.

Thank you for your time.

{{athlete_name}}
{{social_handles}}',
NULL, NULL),

-- Template 2: Follow-up
('Follow-up Check-in', 'follow_up',
'Checking in — {{athlete_name}}, {{grad_year}} {{position}}',
'Hi Coach {{coach_name}},

Just wanted to follow up on my earlier note. I''m still very interested in {{school_name}} and would love to stay connected.

Happy to send new film or answer any questions about my profile.

Thanks,
{{athlete_name}}',
NULL, NULL),

-- Template 3: Highlight Share
('New Highlight Reel', 'highlight_share',
'New highlight reel — {{athlete_name}}, {{grad_year}} {{position}}',
'Hi Coach {{coach_name}},

I just updated my highlight reel with recent game footage. Wanted to send it your way: {{highlight_url}}

Let me know if there''s anything specific you''d like to see more of.

Thanks,
{{athlete_name}}',
NULL, NULL),

-- Template 4: Campus Visit
('Campus Visit Request', 'campus_visit',
'Campus visit interest — {{athlete_name}}, {{grad_year}}',
'Hi Coach {{coach_name}},

I''d love to visit {{school_name}} and see the program. Is there an ID camp, prospect day, or open practice coming up?

I''m also happy to schedule an unofficial visit whenever it works with your schedule.

Looking forward to hearing from you.

Thanks,
{{athlete_name}}',
NULL, NULL),

-- Template 5: Thank You After Camp
('Thank You After Camp', 'thank_you_camp',
'Thank you — {{athlete_name}}, {{school_name}} camp',
'Hi Coach {{coach_name}},

Thank you for the feedback and for running a great camp this weekend. I really enjoyed meeting you and the staff, and I took a lot away from the sessions.

Looking forward to staying in touch.

{{athlete_name}}',
NULL, NULL),

-- Template 6: Schedule Update
('Schedule Update', 'schedule_update',
'Upcoming games — {{athlete_name}}, {{grad_year}} {{position}}',
'Hi Coach {{coach_name}},

Wanted to share my upcoming schedule in case you''re in the area or able to scout via video:

{{upcoming_games}}

Happy to send any logistical info or field locations if helpful.

Thanks,
{{athlete_name}}',
NULL, NULL);

-- Add comments for documentation
COMMENT ON TABLE outreach_log IS 'Tracks all outreach activities by athletes to coaches and programs';
COMMENT ON TABLE outreach_templates IS 'Email templates for outreach - system templates (org_id NULL) visible to all, org templates visible to org members only';
COMMENT ON COLUMN outreach_templates.org_id IS 'NULL for system templates visible to all orgs, specific org_id for org-specific templates';