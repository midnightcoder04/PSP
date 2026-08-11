-- db/migrations/032_session_content_restriction.sql
--
-- Migration 032: per-session content restriction toggle.
--
-- Adds `restrict_to_values` to `sessions`. When true, both the self-paced
-- course app and the live presenter deck end this session's content after
-- the Values chapter/section (Personality → Attitudes → Values), and the
-- participant is prompted for feedback (existing testimonial feature)
-- instead of continuing into Roles & Their Demands and beyond.
--
-- No RLS changes: sessions_all_admin (FOR ALL) and sessions_update_facilitator
-- (USING facilitator_id = auth.uid()) already cover writes to any column on
-- `sessions`, the same way they already let SessionSettingsCard update
-- session_type today.

BEGIN;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS restrict_to_values boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sessions.restrict_to_values IS
  'When true, this session''s course and live deck end after the Values chapter; participants are prompted for feedback instead of continuing into Roles & Their Demands.';

COMMIT;
