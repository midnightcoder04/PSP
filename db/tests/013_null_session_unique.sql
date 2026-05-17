-- Test: NULL-session-id uniqueness on responses + progress (migration 013)
--
-- Asserts that two upserts under (participant_id, exercise_id, session_id IS NULL)
-- yield exactly ONE row in `responses`, and that the matching `progress` row is
-- also a single row.
--
-- Before migration 013: FAILS (Postgres default NULL-distinct lets both INSERTs
--   slip past the unique constraint → row count becomes 2 → RAISE EXCEPTION).
-- After  migration 013: PASSES (NULLS NOT DISTINCT index lets ON CONFLICT match
--   on NULL session_id → second upsert updates the first row → row count = 1).
--
-- Requires: migrations 001–012 applied. Run-once safe: wraps everything in a
-- transaction and ROLLBACKs at the end.
--
-- Run with:   psql "$SUPABASE_DB_URL" -f db/tests/013_null_session_unique.sql
-- Or via MCP: paste into mcp__plugin_supabase_supabase__execute_sql.
--
-- RED proof (2026-05-15, against project okedskadkspeiyxjslqc pre-013):
--   ERROR  P0001: expected exactly 1 response row under NULL session_id after
--                 two upserts, got 2
--   → Confirms the migration-004 unique constraint silently admits duplicates
--     when session_id IS NULL.
--
-- GREEN proof (2026-05-15, run inside a transactional `BEGIN; <013 DDL>; <test>;
--   ROLLBACK;` block against the same project): all three assertions pass —
--   `1 response, 1 progress, second payload preserved`. Live state unchanged.

BEGIN;

-- 1. Fixture user (relies on the on_auth_user_created trigger to populate
--    public.profiles).
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
                        instance_id, aud, role)
VALUES (
  '00000000-0000-4000-8000-000000000201',
  'null-unique-test@example.invalid',
  jsonb_build_object('display_name', 'NULL Unique Test'),
  now(), now(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated'
);

-- 2. Fixture section + one exercise.
INSERT INTO public.sections (id, slug, title, order_index)
VALUES ('00000000-0000-4000-8000-000000000210', '__test_null_unique', 'NULL Unique Test', 998);

INSERT INTO public.exercises (id, section_id, slug, title, type, content_json, order_index)
VALUES ('00000000-0000-4000-8000-000000000211',
        '00000000-0000-4000-8000-000000000210',
        '__ex_null', 'NULL Ex', 'text', '{"prompt":"","placeholder":""}'::jsonb, 1);

-- 3. Two upserts with the same (participant_id, exercise_id, session_id=NULL).
--    This is the exact pattern used by useExerciseSave in src/hooks/useExerciseSave.ts.
INSERT INTO public.responses (participant_id, exercise_id, session_id, response_json, is_complete)
VALUES (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000211',
  NULL,
  '{"value":"first"}'::jsonb,
  false
)
ON CONFLICT (participant_id, exercise_id, session_id) DO UPDATE
  SET response_json = EXCLUDED.response_json,
      is_complete   = EXCLUDED.is_complete,
      updated_at    = now();

INSERT INTO public.responses (participant_id, exercise_id, session_id, response_json, is_complete)
VALUES (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000211',
  NULL,
  '{"value":"second"}'::jsonb,
  true
)
ON CONFLICT (participant_id, exercise_id, session_id) DO UPDATE
  SET response_json = EXCLUDED.response_json,
      is_complete   = EXCLUDED.is_complete,
      updated_at    = now();

-- 4. Assert exactly ONE response row exists.
DO $$
DECLARE
  c integer;
BEGIN
  SELECT COUNT(*) INTO c FROM public.responses
   WHERE participant_id = '00000000-0000-4000-8000-000000000201'
     AND exercise_id    = '00000000-0000-4000-8000-000000000211'
     AND session_id     IS NULL;

  IF c <> 1 THEN
    RAISE EXCEPTION 'expected exactly 1 response row under NULL session_id after two upserts, got %', c;
  END IF;
END $$;

-- 5. Confirm the surviving row carries the SECOND payload (proves the upsert
--    UPDATEd rather than INSERTed-then-deleted).
DO $$
DECLARE
  v jsonb;
BEGIN
  SELECT response_json INTO v FROM public.responses
   WHERE participant_id = '00000000-0000-4000-8000-000000000201'
     AND exercise_id    = '00000000-0000-4000-8000-000000000211'
     AND session_id     IS NULL;

  IF v ->> 'value' <> 'second' THEN
    RAISE EXCEPTION 'expected surviving row to carry second payload, got %', v;
  END IF;
END $$;

-- 6. Assert exactly ONE progress row exists for this section under NULL session.
DO $$
DECLARE
  c integer;
BEGIN
  SELECT COUNT(*) INTO c FROM public.progress
   WHERE participant_id = '00000000-0000-4000-8000-000000000201'
     AND section_id     = '00000000-0000-4000-8000-000000000210'
     AND session_id     IS NULL;

  IF c <> 1 THEN
    RAISE EXCEPTION 'expected exactly 1 progress row under NULL session_id after trigger fired twice, got %', c;
  END IF;
END $$;

ROLLBACK;
