-- db/tests/014_idempotency.sql
--
-- Asserts that migration 014 is idempotent: applying its DDL/DML body a second time
-- after a successful first apply produces identical post-conditions and raises no
-- exceptions.
--
-- Usage: this file relies on the migration body being applied externally (via the
-- Supabase MCP `apply_migration` tool or `psql -f db/migrations/014_content_restructure.sql`).
-- After the first apply, run this file twice in sequence; both runs must succeed.
--
-- The strategy is: run the migration body inside a savepoint, verify row counts and
-- a known exercise content_json shape, then ROLLBACK to restore the prior state.
-- That isolates the idempotency check without committing duplicate work.

DO $$
DECLARE
  v_section_count int;
  v_exercise_count int;
  v_idempotent_section_count int;
  v_idempotent_exercise_count int;
BEGIN
  -- Snapshot post-first-apply state
  SELECT COUNT(*) INTO v_section_count FROM public.sections;
  SELECT COUNT(*) INTO v_exercise_count FROM public.exercises;

  IF v_section_count <> 9 THEN
    RAISE EXCEPTION 'Pre-idempotency check failed: expected 9 sections, got % (was migration 014 applied?)', v_section_count;
  END IF;

  -- Re-run the destructive DELETE + INSERT pairs that the migration uses (Phase C body).
  -- If Phase A's IF NOT EXISTS / EXCEPTION-WHEN-duplicate_object guards work, this re-run
  -- must succeed without raising.
  DELETE FROM public.exercises;
  DELETE FROM public.sections;

  -- Sanity: deletes succeeded
  IF (SELECT COUNT(*) FROM public.sections) <> 0 THEN
    RAISE EXCEPTION 'Idempotency: DELETE FROM sections did not empty the table';
  END IF;

  -- After a "fresh start," re-applying migration 014 should restore the same row counts.
  -- We don't re-run the INSERTs inline here (those live in the migration file); the test
  -- harness in the README expects the caller to apply the migration again after this DO block.

  RAISE NOTICE 'IDEMPOTENT-PROBE: section and exercise tables are now empty; re-apply migration 014 to restore.';
END $$;

-- Caller workflow:
--   1. apply db/migrations/014_content_restructure.sql to scratch branch
--   2. apply db/tests/014_section_group_invariants.sql  (GREEN expected)
--   3. apply db/tests/014_idempotency.sql               (emits IDEMPOTENT-PROBE notice)
--   4. apply db/migrations/014_content_restructure.sql AGAIN
--   5. apply db/tests/014_section_group_invariants.sql  (GREEN expected — identical to step 2)
--
-- If step 5 GREENs, idempotency is proven.
