-- Test: update_progress_on_response trigger (migration 004)
--
-- Asserts:
--   1. Inserting a complete response increments progress.completed_exercises
--      and sets progress.last_exercise_id.
--   2. Updating that response back to is_complete=false decrements the count.
--
-- Requires: migrations 001–006 applied. Safe to run repeatedly — wraps in a
-- transaction and ROLLBACKs at the end so no fixture rows persist.
--
-- Run with:   psql "$SUPABASE_DB_URL" -f db/tests/004_progress_trigger.sql
-- Or via MCP: paste this whole file into mcp__plugin_supabase_supabase__execute_sql.

BEGIN;

-- 1. Fixture user. Insert into auth.users so the on_auth_user_created trigger
--    creates the matching public.profiles row. We bypass auth.identities since
--    we never log in as this user — the test only exercises DB triggers.
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
                        instance_id, aud, role)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'trigger-test@example.invalid',
  jsonb_build_object('display_name', 'Trigger Test'),
  now(), now(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated'
);

-- 2. Fixture section + two exercises. Slugs are namespaced to avoid collision
--    with seed content.
INSERT INTO public.sections (id, slug, title, order_index)
VALUES ('00000000-0000-4000-8000-000000000010', '__test_trigger_section', 'Trigger Test Section', 999);

INSERT INTO public.exercises (id, section_id, slug, title, type, content_json, order_index)
VALUES
  ('00000000-0000-4000-8000-000000000011',
   '00000000-0000-4000-8000-000000000010',
   '__ex_a', 'Ex A', 'text', '{"prompt":"a","placeholder":""}'::jsonb, 1),
  ('00000000-0000-4000-8000-000000000012',
   '00000000-0000-4000-8000-000000000010',
   '__ex_b', 'Ex B', 'text', '{"prompt":"b","placeholder":""}'::jsonb, 2);

-- 3. Insert one complete response → trigger should create progress row with
--    completed=1, total=2, last_exercise_id pointing at exercise A.
INSERT INTO public.responses (participant_id, exercise_id, session_id, response_json, is_complete)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000011',
  NULL,
  '{"text":"hello"}'::jsonb,
  true
);

DO $$
DECLARE
  r RECORD;
BEGIN
  SELECT completed_exercises, total_exercises, last_exercise_id
    INTO r
    FROM public.progress
   WHERE participant_id = '00000000-0000-4000-8000-000000000001'
     AND section_id = '00000000-0000-4000-8000-000000000010';

  IF r.completed_exercises <> 1 THEN
    RAISE EXCEPTION 'expected completed_exercises=1, got %', r.completed_exercises;
  END IF;
  IF r.total_exercises <> 2 THEN
    RAISE EXCEPTION 'expected total_exercises=2, got %', r.total_exercises;
  END IF;
  IF r.last_exercise_id <> '00000000-0000-4000-8000-000000000011' THEN
    RAISE EXCEPTION 'expected last_exercise_id=ex_a, got %', r.last_exercise_id;
  END IF;
END $$;

-- 4. Flip is_complete back to false → count should drop to 0.
UPDATE public.responses
   SET is_complete = false
 WHERE participant_id = '00000000-0000-4000-8000-000000000001'
   AND exercise_id    = '00000000-0000-4000-8000-000000000011';

DO $$
DECLARE
  c integer;
BEGIN
  SELECT completed_exercises INTO c
    FROM public.progress
   WHERE participant_id = '00000000-0000-4000-8000-000000000001'
     AND section_id = '00000000-0000-4000-8000-000000000010';

  IF c <> 0 THEN
    RAISE EXCEPTION 'expected completed_exercises=0 after un-completing, got %', c;
  END IF;
END $$;

ROLLBACK;
