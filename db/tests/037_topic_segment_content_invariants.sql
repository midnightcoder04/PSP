-- db/tests/037_topic_segment_content_invariants.sql
--
-- Deck-insert content for the 14 non-Leadership training topics: assert the
-- post-migration-037 state. RED before migration 037 applies; GREEN after.
--
-- Structural + content-shape invariants. Run via psql or the Supabase MCP; a
-- passing run produces only the final NOTICE.

BEGIN;

DO $$
DECLARE
  v_count      INT;
  v_leader     UUID;
  v_topic_slug TEXT;
  v_topic_id   UUID;
  v_bad        INT;
BEGIN
  -- 1. Leadership Development is untouched: still exactly 2 segments.
  SELECT id INTO v_leader FROM public.training_topics WHERE slug = 'leadership-development';
  IF v_leader IS NULL THEN
    RAISE EXCEPTION 'INVARIANT FAIL: leadership-development topic not found';
  END IF;
  SELECT COUNT(*) INTO v_count FROM public.topic_segments WHERE topic_id = v_leader;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'INVARIANT FAIL: leadership-development segments=% (expected 2, unchanged by migration 037)', v_count;
  END IF;

  -- 2. Each of the 14 other topics now has exactly 4 authored segments.
  FOR v_topic_slug IN
    SELECT unnest(ARRAY[
      'manager-development', 'first-time-manager', 'conflict-management',
      'problem-solving', 'team-building', 'team-bonding',
      'communication-skills', 'productivity-effectiveness', 'critical-thinking',
      'customer-service', 'change-management', 'stress-management',
      'sales-training', 'career-development'])
  LOOP
    SELECT id INTO v_topic_id FROM public.training_topics WHERE slug = v_topic_slug;
    IF v_topic_id IS NULL THEN
      RAISE EXCEPTION 'INVARIANT FAIL: topic slug=% not found', v_topic_slug;
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.topic_segments WHERE topic_id = v_topic_id;
    IF v_count <> 4 THEN
      RAISE EXCEPTION 'INVARIANT FAIL: topic=% segments=% (expected 4)', v_topic_slug, v_count;
    END IF;
  END LOOP;

  -- 3. Total topic_segments count: 2 (leadership-development) + 14*4 (rest).
  SELECT COUNT(*) INTO v_count FROM public.topic_segments;
  IF v_count <> 58 THEN
    RAISE EXCEPTION 'INVARIANT FAIL: topic_segments total=% (expected 58)', v_count;
  END IF;

  -- 4. Every discussion segment has a non-empty questions array.
  SELECT COUNT(*) INTO v_bad
    FROM public.topic_segments
   WHERE kind = 'discussion'
     AND (content_json->'questions' IS NULL
          OR jsonb_typeof(content_json->'questions') <> 'array'
          OR jsonb_array_length(content_json->'questions') = 0);
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'INVARIANT FAIL: % discussion segment(s) missing a non-empty questions array', v_bad;
  END IF;

  -- 5. Every example/suggestion segment has a non-empty body string.
  SELECT COUNT(*) INTO v_bad
    FROM public.topic_segments
   WHERE kind IN ('example', 'suggestion')
     AND (content_json->>'body' IS NULL OR length(trim(content_json->>'body')) = 0);
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'INVARIANT FAIL: % example/suggestion segment(s) missing a non-empty body', v_bad;
  END IF;

  -- 6. Every segment has a non-empty title.
  SELECT COUNT(*) INTO v_bad
    FROM public.topic_segments
   WHERE content_json->>'title' IS NULL OR length(trim(content_json->>'title')) = 0;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'INVARIANT FAIL: % segment(s) missing a non-empty title', v_bad;
  END IF;

  RAISE NOTICE '✓ All migration-037 invariants hold (58 topic_segments total, 4 per new topic, leadership-development unchanged, content shapes valid).';
END $$;

ROLLBACK; -- read-only; leave state untouched
