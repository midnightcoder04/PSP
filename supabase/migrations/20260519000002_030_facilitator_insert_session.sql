-- Migration 030: allow facilitators to create and update their own sessions
--
-- Previously only sessions_all_admin covered writes; facilitators had SELECT
-- only. Adding INSERT (WITH CHECK) and UPDATE (USING) scoped to rows where
-- facilitator_id = the calling user's uid.

DROP POLICY IF EXISTS sessions_insert_facilitator ON public.sessions;
DROP POLICY IF EXISTS sessions_update_facilitator ON public.sessions;

-- Facilitator may insert a session only when they assign it to themselves.
CREATE POLICY sessions_insert_facilitator ON public.sessions FOR INSERT
  WITH CHECK (facilitator_id = auth.uid());

-- Facilitator may update sessions they own.
CREATE POLICY sessions_update_facilitator ON public.sessions FOR UPDATE
  USING (facilitator_id = auth.uid());
