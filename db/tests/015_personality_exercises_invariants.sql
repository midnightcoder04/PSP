-- db/tests/015_personality_exercises_invariants.sql
--
-- Migration 015 invariants test (specs/005-iter5-ux-fixes).
--
-- RED proof (pre-015): expected to fail because:
--   * `identifying-personal-style` + 4 `disc-core-style-*` rows still exist
--   * `core-style-q1-extroversion` etc. do not exist
--   * Personality row count is 7, not 9
-- GREEN proof (post-015): asserts the 9-row inventory + IP attribution +
--   type/attribution preservation for `my-core-style`.
--
-- Mirrors the 013/014 convention (RED/GREEN proof in header).

DO $$
DECLARE
  v_personality_id uuid;
  v_count int;
  v_legacy_count int;
  v_no_attr_count int;
  v_mcs_type text;
  v_mcs_is_scored boolean;
  v_mcs_attribution text;
  v_slug_seq text[];
BEGIN
  SELECT id INTO v_personality_id FROM public.sections WHERE slug = 'personality';
  IF v_personality_id IS NULL THEN
    RAISE EXCEPTION 'Personality section not found — migrations 014 + 015 not applied';
  END IF;

  -- I1: 9 rows total
  SELECT COUNT(*) INTO v_count FROM public.exercises WHERE section_id = v_personality_id;
  IF v_count <> 9 THEN
    RAISE EXCEPTION 'I1: expected 9 Personality exercises, got %', v_count;
  END IF;

  -- Legacy rows must be gone
  SELECT COUNT(*) INTO v_legacy_count FROM public.exercises
   WHERE section_id = v_personality_id
     AND slug IN (
       'identifying-personal-style',
       'disc-core-style-d',
       'disc-core-style-i',
       'disc-core-style-s',
       'disc-core-style-c'
     );
  IF v_legacy_count <> 0 THEN
    RAISE EXCEPTION 'expected 0 legacy DISC checkbox rows, got %', v_legacy_count;
  END IF;

  -- I2: canonical slug sequence
  SELECT array_agg(slug ORDER BY order_index) INTO v_slug_seq
    FROM public.exercises WHERE section_id = v_personality_id;
  IF v_slug_seq <> ARRAY[
    'disc-introduction',
    'core-style-q1-extroversion',
    'core-style-q2-orientation',
    'core-style-result',
    'disc-profile-d',
    'disc-profile-i',
    'disc-profile-s',
    'disc-profile-c',
    'my-core-style'
  ]::text[] THEN
    RAISE EXCEPTION 'I2: Personality slug sequence does not match the canonical post-015 array (got %)', v_slug_seq;
  END IF;

  -- SC-IP-1 / I4: every Personality row EXCEPT my-core-style carries the
  -- Target Training International attribution verbatim.
  SELECT COUNT(*) INTO v_no_attr_count FROM public.exercises
   WHERE section_id = v_personality_id
     AND slug <> 'my-core-style'
     AND (attribution IS NULL OR attribution NOT LIKE '%Target Training International%');
  IF v_no_attr_count <> 0 THEN
    RAISE EXCEPTION 'SC-IP-1: % rows missing TTI attribution', v_no_attr_count;
  END IF;

  -- I7: `my-core-style` row preserved (type/is_scored/attribution unchanged)
  SELECT type, is_scored, attribution
    INTO v_mcs_type, v_mcs_is_scored, v_mcs_attribution
    FROM public.exercises
   WHERE section_id = v_personality_id AND slug = 'my-core-style';
  IF v_mcs_type <> 'text' THEN
    RAISE EXCEPTION 'I7: expected my-core-style type=text, got %', v_mcs_type;
  END IF;
  IF v_mcs_is_scored <> false THEN
    RAISE EXCEPTION 'I7: expected my-core-style is_scored=false';
  END IF;
  IF v_mcs_attribution IS NOT NULL THEN
    RAISE EXCEPTION 'I7: expected my-core-style attribution=NULL, got %', v_mcs_attribution;
  END IF;

  -- I3: slide_group sequence {1,2,2,3,4,4,5,5,6}
  IF (
    SELECT array_agg(slide_group ORDER BY order_index)
    FROM public.exercises WHERE section_id = v_personality_id
  ) <> ARRAY[1,2,2,3,4,4,5,5,6]::int[] THEN
    RAISE EXCEPTION 'I3: slide_group sequence does not match {1,2,2,3,4,4,5,5,6}';
  END IF;

  -- I5: quiz rows have allow_multiple=false and exactly 2 options each
  IF (
    SELECT COUNT(*) FROM public.exercises
    WHERE section_id = v_personality_id
      AND slug IN ('core-style-q1-extroversion','core-style-q2-orientation')
      AND (content_json -> 'allow_multiple')::boolean IS DISTINCT FROM false
  ) <> 0 THEN
    RAISE EXCEPTION 'I5: a quiz row has allow_multiple <> false';
  END IF;
  IF (
    SELECT COUNT(*) FROM public.exercises
    WHERE section_id = v_personality_id
      AND slug IN ('core-style-q1-extroversion','core-style-q2-orientation')
      AND jsonb_array_length(content_json -> 'options') <> 2
  ) <> 0 THEN
    RAISE EXCEPTION 'I5: a quiz row has options count <> 2';
  END IF;

  -- I8: core-style-result has computed='core_style' + computed_inputs = both quizzes
  IF (
    SELECT (content_json ->> 'computed') FROM public.exercises
    WHERE section_id = v_personality_id AND slug = 'core-style-result'
  ) <> 'core_style' THEN
    RAISE EXCEPTION 'I8: core-style-result.content_json.computed != core_style';
  END IF;
  IF NOT (
    SELECT content_json -> 'computed_inputs' @> '["core-style-q1-extroversion","core-style-q2-orientation"]'::jsonb
    FROM public.exercises
    WHERE section_id = v_personality_id AND slug = 'core-style-result'
  ) THEN
    RAISE EXCEPTION 'I8: core-style-result.content_json.computed_inputs missing one of the quiz slugs';
  END IF;

  RAISE NOTICE 'GREEN: 9 Personality rows, canonical sequence, TTI attribution, my-core-style preserved';
END $$;
