-- Migration 028: Security hardening
--
-- Fixes three security vulnerabilities:
--   1. Participants self-escalating role/is_active/max_bulk_add via profiles UPDATE
--   2. Non-atomic invite slot claiming (TOCTOU race on use_count)
--   3. Anon SELECT policy exposing all active invite tokens via table scan

-- ── 1. Privilege-escalation guard on profiles ─────────────────────────────────
-- A BEFORE UPDATE trigger that prevents any authenticated user from patching
-- their own role, is_active, or max_bulk_add. Service-role callers (Edge
-- Functions, admin operations) are not restricted (auth.uid() is NULL for
-- service-role connections, so the guard condition never fires).

CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when an authenticated user is updating their OWN row.
  -- auth.uid() is NULL for service-role callers, so this is a no-op for them.
  -- Admins updating OTHER users' rows are not blocked (auth.uid() <> OLD.id).
  IF auth.uid() IS NOT NULL AND OLD.id = auth.uid() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: role cannot be changed by the account holder';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: is_active cannot be changed by the account holder';
    END IF;
    IF NEW.max_bulk_add IS DISTINCT FROM OLD.max_bulk_add THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: max_bulk_add cannot be changed by the account holder';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation();

-- ── 2. Atomic invite slot claim ────────────────────────────────────────────────
-- Single UPDATE that validates all conditions and increments use_count in one
-- atomic operation, eliminating the TOCTOU read-check-write race in the
-- claim-invite Edge Function. Returns session_id on success, NULL if the invite
-- is invalid or exhausted (concurrent claim beat us to the last slot).

CREATE OR REPLACE FUNCTION public.claim_invite_slot(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  UPDATE public.session_invites
  SET use_count = use_count + 1
  WHERE token = p_token
    AND is_active = true
    AND use_count < max_uses
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING session_id INTO v_session_id;

  RETURN v_session_id;  -- NULL when no row matched (exhausted or invalid)
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_invite_slot(uuid) TO service_role;

-- ── 3. Safe invite peek + drop insecure anon SELECT policy ────────────────────
-- SECURITY DEFINER function that exposes only the single invite matching the
-- supplied token. Replaces the direct anon SELECT on session_invites, which
-- allowed full-table scans to enumerate all active invite tokens.

CREATE OR REPLACE FUNCTION public.peek_invite(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
BEGIN
  SELECT si.is_active, si.expires_at, si.use_count, si.max_uses,
         si.session_id, s.title AS session_title
  INTO v_invite
  FROM public.session_invites si
  JOIN public.sessions s ON s.id = si.session_id
  WHERE si.token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'INVITE_NOT_FOUND');
  END IF;

  IF NOT v_invite.is_active THEN
    RETURN json_build_object('error', 'INVITE_INACTIVE');
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN json_build_object('error', 'INVITE_EXPIRED');
  END IF;

  IF v_invite.use_count >= v_invite.max_uses THEN
    RETURN json_build_object('error', 'INVITE_EXHAUSTED');
  END IF;

  RETURN json_build_object(
    'session_id',    v_invite.session_id,
    'session_title', v_invite.session_title,
    'expires_at',    v_invite.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.peek_invite(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.peek_invite(uuid) TO authenticated;

-- Drop the insecure anon SELECT policy that allowed full-table token enumeration
DROP POLICY IF EXISTS "public_read_invite_by_token" ON public.session_invites;
