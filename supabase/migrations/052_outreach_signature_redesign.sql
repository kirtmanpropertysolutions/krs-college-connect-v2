-- 052_outreach_signature_redesign.sql
--
-- Two changes that ship together because the signature template
-- references the new column:
--
--   1. athletes.phone — needed in the email signature so coaches can
--      text recruits (the standard recruiting flow). Optional; if
--      blank the substitution drops to an empty line, no placeholder.
--
--   2. Rewrite all six seeded outreach templates in a more authentic,
--      mobile-friendly athlete voice. The old templates read corporate
--      (bulleted stat block, three separate film links, "I'd love to
--      stay in touch as my recruiting process develops" boilerplate)
--      and didn't render well on a coach's phone — which is where
--      most recruiting email is actually read. New voice: concise,
--      conversational, one film link, signature block matches the
--      Name / Grad·Club·Position / Phone / Film format.
--
-- Idempotent: phone is ADD COLUMN IF NOT EXISTS; templates are
-- UPDATEs keyed on (template_type, org_id IS NULL) so re-running
-- against an environment that already has the new copy is a no-op.

-- ─── 1. Phone column ──────────────────────────────────────────────
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.athletes.phone IS
  'Athlete''s contact phone number for coach outreach. Optional. '
  'Rendered in outgoing email signatures when set, dropped silently '
  'when null/empty (the template uses the null-drop convention from '
  'substituteTemplate() in Outreach.jsx).';

-- ─── 2. Template rewrites ─────────────────────────────────────────
-- Each UPDATE only touches the SYSTEM templates (org_id IS NULL).
-- Org-customized templates are left alone so club directors who
-- already tuned their copy don't lose it.

-- Initial Contact
UPDATE public.outreach_templates
   SET subject_template =
        '{{grad_year}} {{position}} — {{athlete_name}}, interested in {{school_name}}',
       body_template =
'Hi Coach {{coach_name}},

I''m {{athlete_name}}, a {{grad_year}} {{position}} at {{high_school}} in {{city}}, {{state}}. I play club for {{club_team}}.

I''d like to be on your radar for {{school_name}}. GPA {{gpa}}, jersey #{{jersey_number}}.

Film: {{highlight_url}}

Happy to send more whenever it''s useful.

{{athlete_name}}
{{grad_year}} · {{club_team}} · {{position}}
{{phone}}
{{highlight_url}}'
 WHERE template_type = 'initial' AND org_id IS NULL;

-- Follow-up Check-in
UPDATE public.outreach_templates
   SET subject_template =
        'Checking in — {{athlete_name}}, {{grad_year}} {{position}}',
       body_template =
'Hi Coach {{coach_name}},

Wanted to follow up on my earlier note. Still really interested in {{school_name}} and would love to stay connected.

Happy to send updated film or answer anything about my profile.

{{athlete_name}}
{{grad_year}} · {{club_team}} · {{position}}
{{phone}}
{{highlight_url}}'
 WHERE template_type = 'follow_up' AND org_id IS NULL;

-- Highlight Share
UPDATE public.outreach_templates
   SET subject_template =
        'New film — {{athlete_name}}, {{grad_year}} {{position}}',
       body_template =
'Hi Coach {{coach_name}},

Just updated my highlight reel with recent game footage: {{highlight_url}}

Let me know if there''s anything specific you''d like to see more of.

{{athlete_name}}
{{grad_year}} · {{club_team}} · {{position}}
{{phone}}
{{highlight_url}}'
 WHERE template_type = 'highlight_share' AND org_id IS NULL;

-- Campus Visit Request
UPDATE public.outreach_templates
   SET subject_template =
        'Campus visit — {{athlete_name}}, {{grad_year}} {{position}}',
       body_template =
'Hi Coach {{coach_name}},

I''d love to visit {{school_name}} and see the program. Any ID camps, prospect days, or open practices coming up?

Happy to set up an unofficial visit whenever works for your staff.

{{athlete_name}}
{{grad_year}} · {{club_team}} · {{position}}
{{phone}}
{{highlight_url}}'
 WHERE template_type = 'campus_visit' AND org_id IS NULL;

-- Thank You After Camp
UPDATE public.outreach_templates
   SET subject_template =
        'Thank you — {{athlete_name}}, {{school_name}} camp',
       body_template =
'Hi Coach {{coach_name}},

Thanks for running a great camp this weekend. I really enjoyed the sessions and meeting the staff.

Looking forward to staying in touch.

{{athlete_name}}
{{grad_year}} · {{club_team}} · {{position}}
{{phone}}
{{highlight_url}}'
 WHERE template_type = 'thank_you_camp' AND org_id IS NULL;

-- Schedule Update
UPDATE public.outreach_templates
   SET subject_template =
        'Upcoming games — {{athlete_name}}, {{grad_year}} {{position}}',
       body_template =
'Hi Coach {{coach_name}},

Wanted to share my upcoming schedule in case you''re in the area or scouting via video:

{{upcoming_games}}

Happy to send field locations or any logistical info.

{{athlete_name}}
{{grad_year}} · {{club_team}} · {{position}}
{{phone}}
{{highlight_url}}'
 WHERE template_type = 'schedule_update' AND org_id IS NULL;
