-- 051_program_email_coverage.sql
--
-- Adds the metadata columns the women's soccer coach/program email
-- scraper writes after every pass. The scraper runs the full waterfall
-- of URL patterns (coach page → staff directory → bio page →
-- recruiting questionnaire → program landing page) and stores BOTH
-- the winning email AND the full candidate array for admin review.
--
-- Idempotent. Apply via Supabase SQL Editor (not `supabase db push` —
-- prod migration history is out of sync with the local repo).

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS program_email text,
  ADD COLUMN IF NOT EXISTS program_email_source text,
  ADD COLUMN IF NOT EXISTS program_email_confidence text,
  ADD COLUMN IF NOT EXISTS program_email_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS program_email_url text,
  ADD COLUMN IF NOT EXISTS program_email_failure_reason text,
  ADD COLUMN IF NOT EXISTS program_email_candidates jsonb;

-- Add CHECK constraints separately so re-running the migration on a
-- table that already has the columns (but maybe not the constraints)
-- still installs them. ALTER COLUMN ... ADD CONSTRAINT doesn't have an
-- IF NOT EXISTS, so we DROP first.
ALTER TABLE public.schools
  DROP CONSTRAINT IF EXISTS schools_program_email_source_check;
ALTER TABLE public.schools
  ADD CONSTRAINT schools_program_email_source_check
  CHECK (program_email_source IS NULL OR program_email_source IN (
    'coach_page',
    'staff_directory',
    'coach_bio',
    'recruiting_questionnaire',
    'athletics_contact',
    'manual',
    'unknown'
  ));

ALTER TABLE public.schools
  DROP CONSTRAINT IF EXISTS schools_program_email_confidence_check;
ALTER TABLE public.schools
  ADD CONSTRAINT schools_program_email_confidence_check
  CHECK (program_email_confidence IS NULL OR program_email_confidence IN (
    'verified',
    'likely',
    'missing'
  ));

-- Admin CSV export filters/orders by (confidence, division). The index
-- supports both the WHERE clause ("show me everything still missing")
-- and the per-division grouping.
CREATE INDEX IF NOT EXISTS idx_schools_program_email_confidence
  ON public.schools (program_email_confidence, division);

COMMENT ON COLUMN public.schools.program_email IS
  'Winning outreach email for this women''s soccer program (highest-scored candidate). May be verified or pattern-generated.';
COMMENT ON COLUMN public.schools.program_email_source IS
  'Which scraper strategy produced the winning email: coach_page, staff_directory, coach_bio, recruiting_questionnaire, athletics_contact, manual, unknown.';
COMMENT ON COLUMN public.schools.program_email_confidence IS
  'verified = pulled directly from an athletics page (mailto link or labeled coach card). likely = pattern-generated from name + domain, lower confidence. missing = scraper found nothing usable.';
COMMENT ON COLUMN public.schools.program_email_last_checked_at IS
  'Timestamp of the last scrape attempt for this school (success OR failure).';
COMMENT ON COLUMN public.schools.program_email_url IS
  'The athletics-site URL where the winning email was extracted (or last attempted on failure).';
COMMENT ON COLUMN public.schools.program_email_failure_reason IS
  'Set only when confidence=missing. One of: no_athletics_website, all_strategies_404, cloudflare_blocked, timeout, no_email_in_html, parse_error.';
COMMENT ON COLUMN public.schools.program_email_candidates IS
  'JSONB array of every email candidate found during the most recent scrape pass. Preserved for admin triage even when only one wins the program_email slot. Shape: [{email, role, name, source, url, confidence, score}, ...].';
