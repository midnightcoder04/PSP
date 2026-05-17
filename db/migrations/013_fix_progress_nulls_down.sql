-- Down-migration for 013_fix_progress_nulls.sql
--
-- Restores:
--   1. The migration-004 trigger body (info exercises counted; NULL-equality
--      via the OR-IS-NULL pattern instead of IS NOT DISTINCT FROM).
--   2. The original UNIQUE constraints on `responses` and `progress`.
--
-- NOT reversed:
--   - The dedup performed by 013 is permanent. The original migration produced
--     duplicate rows that were data corruption; re-introducing them would be
--     incorrect.
--
-- Use only if migration 013 needs to be rolled back for some emergency. After
-- this runs, the original bug (RC-1 and RC-2 in plan-progress-fix.md) is back
-- in effect for any NEW writes.

BEGIN;

-- 1. Restore the migration-004 trigger body verbatim.
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

-- 2. Restore the NULL-distinct unique constraints. Drop the NULLS-NOT-DISTINCT
--    indexes first so the constraint creation doesn't conflict on the same
--    column tuple.
DROP INDEX IF EXISTS public.responses_unique_key;
ALTER TABLE public.responses
  ADD CONSTRAINT responses_participant_id_exercise_id_session_id_key
  UNIQUE (participant_id, exercise_id, session_id);

DROP INDEX IF EXISTS public.progress_unique_key;
ALTER TABLE public.progress
  ADD CONSTRAINT progress_participant_id_section_id_session_id_key
  UNIQUE (participant_id, section_id, session_id);

COMMIT;
