-- Migration 012: testimonials table + RLS + indexes + trigger.
--
-- Iteration 4 (003-slide-nav-ux-rework):
-- Participants leave a testimonial at the end of the course. Each row is
-- keyed by (participant_id, session_id) so a participant in multiple cohorts
-- can leave one testimonial per session. Facilitators see testimonials for
-- their own sessions; admins see all. No DELETE policy is created — deletions
-- require the service-role key for moderation incidents.
--
-- RLS self_insert / self_update policies additionally require role='participant'
-- on the actor's profile (resolution of analysis A4 — facilitator-authored
-- testimonials are out of scope for this iteration).

CREATE TABLE public.testimonials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  UUID NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES public.sessions(id)  ON DELETE RESTRICT,
  content         TEXT NOT NULL CHECK (length(content) BETWEEN 50 AND 1500),
  rating          INT  NULL CHECK (rating BETWEEN 1 AND 5),
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participant_id, session_id)
);

CREATE INDEX testimonials_session_id_idx     ON public.testimonials(session_id);
CREATE INDEX testimonials_participant_id_idx ON public.testimonials(participant_id);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Participants read their own
CREATE POLICY testimonials_self_select ON public.testimonials
  FOR SELECT TO authenticated
  USING (participant_id = auth.uid());

-- Only users with role='participant' may insert/update their own
CREATE POLICY testimonials_self_insert ON public.testimonials
  FOR INSERT TO authenticated
  WITH CHECK (
    participant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'participant'
    )
  );

CREATE POLICY testimonials_self_update ON public.testimonials
  FOR UPDATE TO authenticated
  USING (
    participant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'participant'
    )
  )
  WITH CHECK (
    participant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'participant'
    )
  );

-- Facilitators read testimonials for sessions they facilitate
CREATE POLICY testimonials_facilitator_select ON public.testimonials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = testimonials.session_id
        AND s.facilitator_id = auth.uid()
    )
  );

-- Admins read all
CREATE POLICY testimonials_admin_select ON public.testimonials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Generic updated_at trigger function. Reusable by future tables.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
