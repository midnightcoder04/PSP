-- Migration 010: Harden EXECUTE grants on public.* functions
--
-- Addresses Supabase advisor warnings:
--   0028 — Function exposed to anon role (user-callable RPCs and helpers)
--   0029 — Function exposed to anon and authenticated (trigger-only functions)
--
-- Root cause: Postgres grants EXECUTE on functions to PUBLIC by default at
-- function-creation time. REVOKE FROM anon is a no-op while PUBLIC retains the
-- grant (anon inherits EXECUTE through PUBLIC). The correct pattern is:
--   1. REVOKE EXECUTE FROM PUBLIC   (cuts the wildcard grant)
--   2. GRANT  EXECUTE TO authenticated  (re-grants to signed-in users only)
--
-- This migration also retroactively fixes migration 008's helpers, which used
-- REVOKE FROM anon — that was a no-op for the same reason.
--
-- After this migration, pg_proc.proacl for every in-scope function must NOT
-- contain the wildcard '=X/...' ACL entry. Verified in T032 / rpc.test.ts
-- migration_010_post_apply assertions.
--
-- Intentionally left alone (Supabase platform internal):
--   rls_auto_enable — not a user-defined function; managed by platform

-- ---------------------------------------------------------------------------
-- Group 1: User-callable RPCs
-- These are callable by authenticated users via PostgREST.
-- The Supabase platform adds both a PUBLIC wildcard AND an explicit anon grant
-- when functions are created, so both must be revoked.
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.get_admin_overview() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_overview() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_admin_overview() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_session_stats(p_session_id uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_session_stats(p_session_id uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_session_stats(p_session_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_resume_position(p_participant_id uuid, p_session_id uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_resume_position(p_participant_id uuid, p_session_id uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_resume_position(p_participant_id uuid, p_session_id uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Group 2: Trigger-only functions
-- These are invoked exclusively by Postgres triggers, not by role-level callers.
-- Triggers fire under the function-owner context — role-level EXECUTE grants
-- are not consulted during trigger execution. REVOKE PUBLIC + anon, no new GRANT.
-- Note: authenticated=X remains (platform default); PostgREST won't route TRIGGER-
-- returning functions anyway so this is acceptable.
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

REVOKE EXECUTE ON FUNCTION public.update_progress_on_response() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_progress_on_response() FROM anon;

-- ---------------------------------------------------------------------------
-- Group 3: RLS helper functions (retroactively fixing migration 008)
-- Migration 008 used REVOKE FROM anon — a no-op while PUBLIC held the grant.
-- Apply the correct pattern here.
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.is_admin(uid uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_admin(uid uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_active_user(uid uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_active_user(uid uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.facilitates_session(uid uuid, sid uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.facilitates_session(uid uuid, sid uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.participant_in_session(uid uuid, sid uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.participant_in_session(uid uuid, sid uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.facilitator_has_participant(uid uuid, pid uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.facilitator_has_participant(uid uuid, pid uuid) TO authenticated;
