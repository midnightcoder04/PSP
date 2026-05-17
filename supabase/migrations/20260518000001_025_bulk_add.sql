-- Migration 025: Bulk member add — facilitator cap + session invite links

-- ── profiles: facilitator bulk-add cap ───────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN max_bulk_add integer NOT NULL DEFAULT 1
  CHECK (max_bulk_add >= 1);

-- ── session_invites ───────────────────────────────────────────────────────────
CREATE TABLE public.session_invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  token       uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by  uuid        NOT NULL REFERENCES public.profiles(id),
  max_uses    integer     NOT NULL DEFAULT 50 CHECK (max_uses >= 1),
  use_count   integer     NOT NULL DEFAULT 0  CHECK (use_count >= 0),
  expires_at  timestamptz,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX session_invites_token_idx   ON public.session_invites(token);
CREATE INDEX session_invites_session_idx ON public.session_invites(session_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.session_invites ENABLE ROW LEVEL SECURITY;

-- Admin: full CRUD
CREATE POLICY "admin_all_invites" ON public.session_invites
  FOR ALL TO authenticated
  USING     (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Facilitator: manage invites for sessions they facilitate
CREATE POLICY "facilitator_own_invites" ON public.session_invites
  FOR ALL TO authenticated
  USING     (public.facilitates_session(auth.uid(), session_id))
  WITH CHECK (public.facilitates_session(auth.uid(), session_id));

-- Anon: read-only lookup by token (used by invite landing page before login)
CREATE POLICY "public_read_invite_by_token" ON public.session_invites
  FOR SELECT TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
