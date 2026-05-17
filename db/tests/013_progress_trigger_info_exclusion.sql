-- Test: progress trigger excludes type='info' exercises from v_total / v_completed
--       (migration 013)
--
-- Asserts that a section containing one info + one checkbox exercise auto-marks
-- `section_completed_at` once the checkbox response is `is_complete=true`,
-- AND that `progress.total_exercises = 1` (info excluded — matches the
-- client-side semantics in src/pages/course/SectionPage.tsx:148).
--
-- Before migration 013: FAILS — v_total = 2 (info counted), v_completed = 1,
--   so `section_completed_at` stays NULL and total_exercises = 2.
-- After  migration 013: PASSES — v_total = 1 (info excluded), v_completed = 1,
--   so `section_completed_at = now()` and total_exercises = 1.
--
-- Requires: migrations 001–012 applied. Run-once safe: wraps in BEGIN/ROLLBACK.
--
-- Run with:   psql "$SUPABASE_DB_URL" -f db/tests/013_progress_trigger_info_exclusion.sql
-- Or via MCP: paste into mcp__plugin_supabase_supabase__execute_sql.
--
-- RED proof (2026-05-15, against project okedskadkspeiyxjslqc pre-013):
--   ERROR  P0001: expected total_exercises=1 (info excluded), got 2
--   → Confirms the migration-004 trigger counts info exercises in v_total,
--     preventing sections with info from auto-completing.
--
-- GREEN proof (2026-05-15, run inside a transactional `BEGIN; <013 DDL>; <test>;
--   ROLLBACK;` block against the same project): all four assertions pass —
--   `total=1, completed=1, section_completed_at IS NOT NULL`. Live state
--   unchanged.

BEGIN;

-- 1. Fixture user.
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
                        instance_id, aud, role)
VALUES (
  '00000000-0000-4000-8000-000000000301',
  'info-excl-test@example.invalid',
  jsonb_build_object('display_name', 'Info Exclusion Test'),
  now(), now(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated'
);

-- 2. Fixture section with one info exercise + one checkbox exercise.
INSERT INTO public.sections (id, slug, title, order_index)
VALUES ('00000000-0000-4000-8000-000000000310', '__test_info_excl', 'Info Exclusion Test', 997);

INSERT INTO public.exercises (id, section_id, slug, title, type, content_json, order_index)
VALUES
  ('00000000-0000-4000-8000-000000000311',
   '00000000-0000-4000-8000-000000000310',
   '__ex_info_only', 'Info Only', 'info',
   '{"content":"static reference text"}'::jsonb, 1),
  ('00000000-0000-4000-8000-000000000312',
   '00000000-0000-4000-8000-000000000310',
   '__ex_checkbox', 'Pick One', 'checkbox',
   '{"prompt":"pick","options":[{"id":"a","label":"A"}]}'::jsonb, 2);

-- 3. Mark the checkbox response complete. The info exercise has no response —
--    that's the whole point of this test.
INSERT INTO public.responses (participant_id, exercise_id, session_id, response_json, is_complete)
VALUES (
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000312',
  NULL,
  '{"selected_ids":["a"]}'::jsonb,
  true
);

-- 4. Assert the progress row reflects info-excluded counts and is marked complete.
DO $$
DECLARE
  r RECORD;
  row_count integer;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.progress
   WHERE participant_id = '00000000-0000-4000-8000-000000000301'
     AND section_id     = '00000000-0000-4000-8000-000000000310';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'expected exactly 1 progress row, got %', row_count;
  END IF;

  SELECT total_exercises, completed_exercises, section_completed_at
    INTO r
    FROM public.progress
   WHERE participant_id = '00000000-0000-4000-8000-000000000301'
     AND section_id     = '00000000-0000-4000-8000-000000000310';

  IF r.total_exercises <> 1 THEN
    RAISE EXCEPTION 'expected total_exercises=1 (info excluded), got %', r.total_exercises;
  END IF;
  IF r.completed_exercises <> 1 THEN
    RAISE EXCEPTION 'expected completed_exercises=1, got %', r.completed_exercises;
  END IF;
  IF r.section_completed_at IS NULL THEN
    RAISE EXCEPTION 'expected section_completed_at IS NOT NULL (1/1 complete), got NULL';
  END IF;
END $$;

ROLLBACK;
