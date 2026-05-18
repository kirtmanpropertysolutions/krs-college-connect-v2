-- 049_complete_with_check.sql
--
-- Two RLS policies that 044_security_hardening_with_check.sql missed:
--
--   (1) profiles "Users update own profile" — was FOR UPDATE with only
--       a USING clause. An authenticated user could UPDATE their own
--       profile row and (because no WITH CHECK) set role='admin' or
--       move themselves to a different org_id. That's a privilege
--       escalation path.
--
--   (2) highlight_videos "Athletes manage own highlight_videos" — FOR
--       ALL with only USING. The INSERT/UPDATE branches of ALL had no
--       WITH CHECK, so an authenticated user could INSERT a clip row
--       claiming athlete_id of a different user. Impersonation path.
--
-- This migration:
--   * Adds WITH CHECK to both policies via ALTER POLICY.
--   * Installs a BEFORE-UPDATE trigger on profiles that hard-blocks any
--     attempt by an authenticated user to mutate role, org_id, or id.
--     RLS WITH CHECK alone could be tightened to forbid role escalation
--     but only at the cost of a subquery on profiles inside a profiles
--     policy, which would recurse. A trigger is the standard escape
--     hatch.
--
-- service_role bypasses RLS and triggers via the trigger guard's role
-- check, so admin/server flows that legitimately change role/org_id
-- (validate-invite, admin promotion) still work.

-- ── 1. profiles UPDATE policy: add WITH CHECK ────────────────────
ALTER POLICY "Users update own profile" ON public.profiles
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── 2. highlight_videos ALL policy: add WITH CHECK ───────────────
ALTER POLICY "Athletes manage own highlight_videos" ON public.highlight_videos
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

-- ── 3. Trigger: block role/org_id/id mutation on profiles ────────
-- WITH CHECK alone says "the new row must satisfy id = auth.uid()",
-- which already prevents identity hijacking. But the row's role and
-- org_id columns are still mutable inside that constraint — an
-- athlete could PATCH their own profile with {role: "admin"} or
-- {org_id: "<other org>"}. The trigger guards those columns.
CREATE OR REPLACE FUNCTION public._enforce_profile_immutable_cols()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- service_role bypass: triggers run under the calling role, so we
  -- check the JWT claim. The validate-invite endpoint runs with
  -- service_role and legitimately sets role + org_id on signup.
  IF current_setting('request.jwt.claim.role', true) IN ('service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profiles.id is immutable';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles.role can only be changed by an administrator';
  END IF;

  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'profiles.org_id can only be changed by an administrator';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_enforce_immutable_cols ON public.profiles;

CREATE TRIGGER profiles_enforce_immutable_cols
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public._enforce_profile_immutable_cols();
