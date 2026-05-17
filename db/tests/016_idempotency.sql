-- db/tests/016_idempotency.sql
--
-- 006-iter6 / US3 (T035): run migration 016 twice and assert the invariants
-- still hold (same final state). Exercises the responses-DELETE + UPSERT
-- idempotency path.
--
-- Usage: psql -f db/tests/016_idempotency.sql
-- Requires migration 015 (and prior) to have been applied first.

\i db/migrations/016_personality_deep_dive.sql
\i db/migrations/016_personality_deep_dive.sql
\i db/tests/016_deep_dive_exercises_invariants.sql
