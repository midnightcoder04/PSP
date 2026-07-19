-- Migration 033: presenter authorization flag
--
-- Adds profiles.can_present — an admin-granted capability (mirrors the
-- max_bulk_add pattern from 025) that authorizes a facilitator to run the
-- full-screen presentation mode with live session responses.
--
--   1. profiles.can_present boolean, default false
--   2. prevent_privilege_escalation() re-created to also block self-granting it
--   3. has_presenter_access(uid) SECURITY DEFINER helper for RLS/RPC gating

-- ── 1. Capability column ──────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN can_present boolean NOT NULL DEFAULT false;

-- ── 2. Extend privilege-escalation guard (full body from 028 + can_present) ──

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
    IF NEW.can_present IS DISTINCT FROM OLD.can_present THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: can_present cannot be changed by the account holder';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. Presenter-access helper ────────────────────────────────────────────────
-- Admins always have presenter access; facilitators only when flagged.
-- Used by deck_slides RLS (034) and get_session_live_responses (035).

CREATE OR REPLACE FUNCTION public.has_presenter_access(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = uid AND p.is_active = true
       AND (p.role = 'admin' OR (p.role = 'facilitator' AND p.can_present = true))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_presenter_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_presenter_access(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.has_presenter_access(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.has_presenter_access(uuid) TO service_role;
