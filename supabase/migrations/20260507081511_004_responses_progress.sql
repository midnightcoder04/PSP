-- Migration 004: responses + progress tables + trigger

CREATE TABLE IF NOT EXISTS public.responses (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid        NOT NULL REFERENCES public.profiles(id),
  exercise_id    uuid        NOT NULL REFERENCES public.exercises(id),
  session_id     uuid        REFERENCES public.sessions(id),
  response_json  jsonb       NOT NULL,
  is_complete    boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, exercise_id, session_id)
);

CREATE INDEX IF NOT EXISTS responses_participant_idx ON public.responses (participant_id);
CREATE INDEX IF NOT EXISTS responses_session_idx     ON public.responses (session_id);
CREATE INDEX IF NOT EXISTS responses_exercise_idx    ON public.responses (exercise_id);

CREATE TABLE IF NOT EXISTS public.progress (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id        uuid        NOT NULL REFERENCES public.profiles(id),
  section_id            uuid        NOT NULL REFERENCES public.sections(id),
  session_id            uuid        REFERENCES public.sessions(id),
  completed_exercises   integer     NOT NULL DEFAULT 0,
  total_exercises       integer     NOT NULL,
  section_completed_at  timestamptz,
  last_exercise_id      uuid        REFERENCES public.exercises(id),
  last_activity_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, section_id, session_id)
);

CREATE INDEX IF NOT EXISTS progress_participant_idx ON public.progress (participant_id);
CREATE INDEX IF NOT EXISTS progress_session_idx     ON public.progress (session_id);

-- Trigger: update progress when a response is inserted or updated
CREATE OR REPLACE FUNCTION public.update_progress_on_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_section_id    uuid;
  v_total         integer;
  v_completed     integer;
  v_completed_at  timestamptz;
BEGIN
  SELECT e.section_id INTO v_section_id
  FROM public.exercises e WHERE e.id = NEW.exercise_id;

  SELECT COUNT(*) INTO v_total
  FROM public.exercises e WHERE e.section_id = v_section_id;

  SELECT COUNT(*) INTO v_completed
  FROM public.responses r
  JOIN public.exercises e ON e.id = r.exercise_id
  WHERE r.participant_id = NEW.participant_id
    AND e.section_id = v_section_id
    AND (r.session_id = NEW.session_id OR (r.session_id IS NULL AND NEW.session_id IS NULL))
    AND r.is_complete = true;

  IF v_completed >= v_total THEN
    v_completed_at := now();
  ELSE
    v_completed_at := NULL;
  END IF;

  INSERT INTO public.progress (
    participant_id, section_id, session_id,
    completed_exercises, total_exercises,
    section_completed_at, last_exercise_id, last_activity_at
  )
  VALUES (
    NEW.participant_id, v_section_id, NEW.session_id,
    v_completed, v_total,
    v_completed_at, NEW.exercise_id, now()
  )
  ON CONFLICT (participant_id, section_id, session_id) DO UPDATE SET
    completed_exercises  = EXCLUDED.completed_exercises,
    total_exercises      = EXCLUDED.total_exercises,
    section_completed_at = EXCLUDED.section_completed_at,
    last_exercise_id     = EXCLUDED.last_exercise_id,
    last_activity_at     = EXCLUDED.last_activity_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_progress_on_response ON public.responses;
CREATE TRIGGER update_progress_on_response
  AFTER INSERT OR UPDATE ON public.responses
  FOR EACH ROW EXECUTE FUNCTION public.update_progress_on_response();

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress  ENABLE ROW LEVEL SECURITY;
