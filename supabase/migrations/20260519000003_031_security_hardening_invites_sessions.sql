-- Migration 031: security hardening — session_invites INSERT cap + sessions UPDATE guard
--
-- Fix 1: session_invites INSERT now enforces max_uses <= caller's max_bulk_add.
--   The previous "facilitator_own_invites" FOR ALL policy only checked that the
--   caller facilitates the session — a facilitator could bypass their max_bulk_add
--   limit by calling the API directly with max_uses = 9999. The FOR ALL policy is
--   split into per-operation policies so INSERT carries the extra cap while
--   UPDATE/DELETE (used for revoke) are not blocked by the max_uses value.
--
-- Fix 2: sessions_update_facilitator gains WITH CHECK (facilitator_id = auth.uid()).
--   Without it, a facilitator could UPDATE facilitator_id to any arbitrary uuid,
--   effectively reassigning (and orphaning) a session they own.

-- ── session_invites ───────────────────────────────────────────────────────────

-- Drop the catch-all policy; replace with per-operation policies
DROP POLICY IF EXISTS "facilitator_own_invites" ON public.session_invites;

-- SELECT: same as before
CREATE POLICY "facilitator_select_invites" ON public.session_invites
  FOR SELECT TO authenticated
  USING (public.facilitates_session(auth.uid(), session_id));

-- UPDATE (revoke = set is_active=false): same check; no max_uses constraint
-- so revoking a high-limit invite is never blocked
CREATE POLICY "facilitator_modify_invites" ON public.session_invites
  FOR UPDATE TO authenticated
  USING     (public.facilitates_session(auth.uid(), session_id))
  WITH CHECK (public.facilitates_session(auth.uid(), session_id));

-- DELETE: same as before
CREATE POLICY "facilitator_delete_invites" ON public.session_invites
  FOR DELETE TO authenticated
  USING (public.facilitates_session(auth.uid(), session_id));

-- INSERT: additionally enforce max_uses <= facilitator's configured limit
CREATE POLICY "facilitator_insert_invites" ON public.session_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    public.facilitates_session(auth.uid(), session_id)
    AND max_uses <= (
      SELECT p.max_bulk_add FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- ── sessions ──────────────────────────────────────────────────────────────────

-- Replace the UPDATE policy with one that also blocks reassigning facilitator_id
DROP POLICY IF EXISTS sessions_update_facilitator ON public.sessions;

CREATE POLICY sessions_update_facilitator ON public.sessions FOR UPDATE
  USING     (facilitator_id = auth.uid())
  WITH CHECK (facilitator_id = auth.uid());
