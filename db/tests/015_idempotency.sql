-- db/tests/015_idempotency.sql
--
-- Asserts that migration 015 is idempotent: applying its DML body a second
-- time after a successful first apply produces identical post-conditions
-- and raises no exceptions.
--
-- Usage: applies the migration twice via \i, then asserts the same
-- invariants as 015_personality_exercises_invariants.sql.

\i db/migrations/015_personality_quiz.sql
\i db/migrations/015_personality_quiz.sql

-- After two applies, run the invariant suite. If anything drifted, this
-- raises an exception.
\i db/tests/015_personality_exercises_invariants.sql

DO $$ BEGIN
  RAISE NOTICE 'GREEN: migration 015 is idempotent across two applies';
END $$;
