-- Migration 002: sessions + enrollments tables

CREATE TABLE IF NOT EXISTS public.sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id  uuid        NOT NULL REFERENCES public.profiles(id),
  title           text        NOT NULL,
  description     text,
  scheduled_start date,
  scheduled_end   date,
  is_active       boolean     NOT NULL DEFAULT true,
  created_by      uuid        NOT NULL REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_facilitator_idx ON public.sessions (facilitator_id);
CREATE INDEX IF NOT EXISTS sessions_active_idx      ON public.sessions (is_active);

CREATE TABLE IF NOT EXISTS public.enrollments (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  participant_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at    timestamptz NOT NULL DEFAULT now(),
  is_active      boolean     NOT NULL DEFAULT true,
  UNIQUE (session_id, participant_id)
);

CREATE INDEX IF NOT EXISTS enrollments_session_idx     ON public.enrollments (session_id);
CREATE INDEX IF NOT EXISTS enrollments_participant_idx ON public.enrollments (participant_id);

ALTER TABLE public.sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
