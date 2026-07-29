-- db/tests/036_training_topics_invariants.sql
--
-- 007 topic-aware presentation: assert the post-migration-036 state.
-- RED before migration 036 applies; GREEN after.
--
-- Structural + RLS-policy invariants (role-simulated access checks are covered
-- by the frontend RPC gating tests). Run via psql or the Supabase MCP; a
-- passing run produces only the final NOTICE.

BEGIN;

DO $$
DECLARE
  v_default TEXT;
  v_count   INT;
  v_leader  UUID;
BEGIN
  -- 1. sessions.session_type exists, defaults to 'individual'.
  SELECT column_default INTO v_default
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'session_type';
  IF v_default IS NULL THEN
    RAISE EXCEPTION 'INVARIANT FAIL: sessions.session_type column missing';
  END IF;
  IF v_default NOT LIKE '%individual%' THEN
    RAISE EXCEPTION 'INVARIANT FAIL: sessions.session_type default=% (expected individual)', v_default;
  END IF;

  -- 2. The three new tables exist with RLS enabled.
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'training_topics' AND relrowsecurity) THEN
    RAISE EXCEPTION 'INVARIANT FAIL: training_topics missing or RLS disabled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'session_topics' AND relrowsecurity) THEN
    RAISE EXCEPTION 'INVARIANT FAIL: session_topics missing or RLS disabled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'topic_segments' AND relrowsecurity) THEN
    RAISE EXCEPTION 'INVARIANT FAIL: topic_segments missing or RLS disabled';
  END IF;

  -- 3. Admin-write + presenter-read policies exist.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_topics' AND policyname = 'training_topics_write_admin') THEN
    RAISE EXCEPTION 'INVARIANT FAIL: training_topics_write_admin policy missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_topics' AND policyname = 'training_topics_select_presenter') THEN
    RAISE EXCEPTION 'INVARIANT FAIL: training_topics_select_presenter policy missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'session_topics' AND policyname = 'session_topics_facilitator') THEN
    RAISE EXCEPTION 'INVARIANT FAIL: session_topics_facilitator policy missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'topic_segments' AND policyname = 'topic_segments_write_admin') THEN
    RAISE EXCEPTION 'INVARIANT FAIL: topic_segments_write_admin policy missing';
  END IF;

  -- 4. topic_segments.kind is constrained to the three authored kinds.
  IF EXISTS (
    SELECT 1 FROM public.topic_segments WHERE kind NOT IN ('discussion', 'example', 'suggestion')
  ) THEN
    RAISE EXCEPTION 'INVARIANT FAIL: topic_segments has a kind outside the allowed set';
  END IF;

  -- 5. Seed: 15 catalog topics; Leadership Development has 2 demo inserts.
  SELECT COUNT(*) INTO v_count FROM public.training_topics;
  IF v_count < 15 THEN
    RAISE EXCEPTION 'INVARIANT FAIL: training_topics COUNT=% (expected >= 15 seeded)', v_count;
  END IF;

  SELECT id INTO v_leader FROM public.training_topics WHERE slug = 'leadership-development';
  IF v_leader IS NULL THEN
    RAISE EXCEPTION 'INVARIANT FAIL: leadership-development topic not seeded';
  END IF;
  SELECT COUNT(*) INTO v_count FROM public.topic_segments WHERE topic_id = v_leader;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'INVARIANT FAIL: leadership-development segments=% (expected 2)', v_count;
  END IF;

  RAISE NOTICE '✓ All migration-036 invariants hold (session_type + 3 RLS tables + policies + seed).';
END $$;

ROLLBACK; -- read-only; leave state untouched
