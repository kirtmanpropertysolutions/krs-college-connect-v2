-- 047_atomic_invite_consume.sql
-- Atomic invite-code consumption RPC. The old flow in
-- api/admin/validate-invite.js was a SELECT-then-UPDATE pair that two
-- concurrent signups could race: both reads see uses=2 with max_uses=3,
-- both writes set uses=3, and you've now leaked an extra signup past
-- the cap. Worse, the endpoint trusted a client-supplied userId.
--
-- The hardened endpoint now:
--   * Pulls user identity from the verified JWT (auth.getUser), never
--     from the request body.
--   * Calls consume_invite_code(p_code) which row-locks the invite
--     (SELECT … FOR UPDATE) and returns (org_id, ok, reason).
--   * Returns a generic "Invalid or expired" message for any failure
--     so attackers can't distinguish not_found / expired / exhausted.
--
-- SECURITY DEFINER + locked search_path lets this function bypass RLS
-- on invite_codes without exposing it to anon / authenticated. Only
-- the service_role JWT (used by the Vercel function) can call it.

CREATE OR REPLACE FUNCTION public.consume_invite_code(p_code text)
RETURNS TABLE (org_id uuid, ok boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite invite_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_invite
    FROM invite_codes
   WHERE code = p_code
     AND active = true
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false, 'not_found';
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::uuid, false, 'expired';
    RETURN;
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.uses >= v_invite.max_uses THEN
    RETURN QUERY SELECT NULL::uuid, false, 'exhausted';
    RETURN;
  END IF;

  UPDATE invite_codes
     SET uses = uses + 1
   WHERE id = v_invite.id;

  RETURN QUERY SELECT v_invite.org_id, true, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_invite_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_invite_code(text) TO service_role;
