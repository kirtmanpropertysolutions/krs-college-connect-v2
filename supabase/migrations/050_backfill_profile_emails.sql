-- 050_backfill_profile_emails.sql
--
-- One-time backfill: copy emails from auth.users into profiles.email
-- for any profile row that currently has a NULL or blank email.
--
-- Why this was needed:
--   The signup endpoint api/admin/validate-invite.js was creating
--   profile rows with (id, org_id, role) only — it never wrote the
--   email. The email lives in auth.users (Supabase's auth schema),
--   which PostgREST doesn't expose, so the admin AdminAthletes page
--   queried profiles.email and rendered "No email on file" for every
--   athlete who'd ever signed up. The endpoint is now patched to
--   include email going forward; this migration fixes the historical
--   roster.
--
-- Idempotent: only touches rows that are missing the email.

UPDATE public.profiles p
   SET email = u.email
  FROM auth.users u
 WHERE p.id = u.id
   AND (p.email IS NULL OR p.email = '')
   AND u.email IS NOT NULL;
