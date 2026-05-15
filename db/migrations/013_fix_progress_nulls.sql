-- Migration 013: fix section-lock false positives
--
-- Two bugs in migration 004 are repaired:
--
--   RC-1  UNIQUE (participant_id, …_id, session_id) on `responses` and `progress`
--         is silently bypassed when session_id IS NULL (Postgres default treats
--         NULLs as distinct). Every upsert under the "solo course" path therefore
--         INSERTs a fresh row instead of UPDATING. Over time, duplicates inflate
--         the progress trigger's v_completed past v_total → section_completed_at
--         gets set for sections that aren't legitimately complete.
--
--   RC-2  update_progress_on_response counts info exercises in v_total, but info
--         exercises never produce responses — so sections that contain an info
--         exercise can never legitimately auto-complete. Combined with RC-1 the
--         net result is non-deterministic section locking.
--
-- This migration:
--   1. Dedupes responses (keep most-recent row per key, tie-break on id).
--   2. Dedupes progress similarly (tie-break on last_activity_at, id).
--   3. Drops the old unique constraints and replaces them with unique indexes
--      using NULLS NOT DISTINCT (PG 15+ feature; project is on PG 17).
--   4. Updates the trigger to filter `e.type <> 'info'` in v_total AND v_completed,
--      matching the client-side semantics in src/pages/course/SectionPage.tsx.
--   5. Backfills `completed_exercises`, `total_exercises`, `section_completed_at`
--      for every surviving progress row against current responses, so stale
--      completions from the corrupt-row era are cleared.
--
-- Plan reference: specs/003-slide-nav-ux-rework/plan-progress-fix.md
-- Down-migration: 013_fix_progress_nulls_down.sql (dedup is NOT reversed).

BEGIN;

-- 1. Dedup responses. Keep the row with the greatest (updated_at, id) per key.
--    `IS NOT DISTINCT FROM` is the NULL-aware equality operator.
DELETE FROM public.responses r
USING public.responses r2
WHERE r.participant_id = r2.participant_id
  AND r.exercise_id    = r2.exercise_id
  AND r.session_id IS NOT DISTINCT FROM r2.session_id
  AND (r.updated_at, r.id) < (r2.updated_at, r2.id);

-- 2. Dedup progress.
DELETE FROM public.progress p
USING public.progress p2
WHERE p.participant_id = p2.participant_id
  AND p.section_id     = p2.section_id
  AND p.session_id IS NOT DISTINCT FROM p2.session_id
  AND (p.last_activity_at, p.id) < (p2.last_activity_at, p2.id);

-- 3. Swap unique constraints for NULLS-NOT-DISTINCT unique indexes.
--    Drop the constraint first (which also drops its implicit index), then
--    create an explicit unique index that ON CONFLICT (cols) can target.
ALTER TABLE public.responses
  DROP CONSTRAINT IF EXISTS responses_participant_id_exercise_id_session_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS responses_unique_key
  ON public.responses (participant_id, exercise_id, session_id)
  NULLS NOT DISTINCT;

ALTER TABLE public.progress
  DROP CONSTRAINT IF EXISTS progress_participant_id_section_id_session_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS progress_unique_key
  ON public.progress (participant_id, section_id, session_id)
  NULLS NOT DISTINCT;

-- 4. Trigger update: exclude info exercises from both counts and use
--    NULL-aware session_id comparison.
CREATE OR REPLACE FUNCTION public.update_progress_on_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_section_id   uuid;
  v_total        integer;
  v_completed    integer;
  v_completed_at timestamptz;
BEGIN
  SELECT e.section_id INTO v_section_id
  FROM public.exercises e WHERE e.id = NEW.exercise_id;

  SELECT COUNT(*) INTO v_total
  FROM public.exercises e
  WHERE e.section_id = v_section_id
    AND e.type <> 'info';

  SELECT COUNT(*) INTO v_completed
  FROM public.responses r
  JOIN public.exercises e ON e.id = r.exercise_id
  WHERE r.participant_id = NEW.participant_id
    AND e.section_id     = v_section_id
    AND e.type <> 'info'
    AND r.session_id IS NOT DISTINCT FROM NEW.session_id
    AND r.is_complete    = true;

  v_completed_at := CASE
    WHEN v_total > 0 AND v_completed >= v_total THEN now()
    ELSE NULL
  END;

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

-- 5. Backfill: recompute progress fields against current (post-dedup) responses
--    for every surviving progress row. Uses the same info-excluded semantics
--    as the trigger above. If a section has no non-info exercises (edge case),
--    leave section_completed_at NULL.
WITH agg AS (
  SELECT
    p.id  AS progress_id,
    p.section_completed_at AS prior_completed_at,
    COUNT(r.id) FILTER (
      WHERE r.is_complete AND e.type <> 'info'
    ) AS v_completed,
    (SELECT COUNT(*) FROM public.exercises e2
       WHERE e2.section_id = p.section_id
         AND e2.type <> 'info') AS v_total
  FROM public.progress p
  LEFT JOIN public.responses r
    ON r.participant_id = p.participant_id
   AND r.session_id IS NOT DISTINCT FROM p.session_id
  LEFT JOIN public.exercises e
    ON e.id = r.exercise_id
   AND e.section_id = p.section_id
  GROUP BY p.id, p.section_id, p.section_completed_at
)
UPDATE public.progress p
SET completed_exercises  = agg.v_completed,
    total_exercises      = agg.v_total,
    section_completed_at = CASE
      WHEN agg.v_total > 0 AND agg.v_completed >= agg.v_total
        THEN COALESCE(agg.prior_completed_at, now())
      ELSE NULL
    END
FROM agg
WHERE p.id = agg.progress_id;

COMMIT;
