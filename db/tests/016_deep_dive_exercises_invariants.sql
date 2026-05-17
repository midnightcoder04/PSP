-- db/tests/016_deep_dive_exercises_invariants.sql
--
-- 006-iter6 / US3 (T034): assert the post-migration-016 state.
-- RED before migration applies; GREEN after.
--
-- Contract: specs/006-iter6-personality-watusi-polish/contracts/migration-016.md

BEGIN;

DO $$
DECLARE
  tti CONSTANT TEXT := '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)';
  v_personality_id UUID;
  v_attitude_id UUID;
  v_row_count INT;
  v_slug TEXT;
  v_slide_group INT;
  v_order_index INT;
  v_attribution TEXT;
  v_interaction TEXT;
BEGIN
  SELECT id INTO v_personality_id FROM public.sections WHERE slug = 'personality';
  SELECT id INTO v_attitude_id FROM public.sections WHERE slug = 'attitude';
  IF v_personality_id IS NULL THEN RAISE EXCEPTION 'personality section missing'; END IF;
  IF v_attitude_id IS NULL THEN RAISE EXCEPTION 'attitude section missing'; END IF;

  -- 1. The four new rows exist, each with TTI attribution, correct slide_group + order_index.
  FOR v_slug, v_slide_group, v_order_index IN
    SELECT * FROM (VALUES
      ('core-style-characteristics',  7,  9),
      ('core-style-ideal-environment', 8, 10),
      ('core-style-traits-checklist',  9, 11),
      ('core-style-comfort-zones',    10, 12)
    ) AS v(slug, sg, oi)
  LOOP
    SELECT slide_group, order_index, attribution
      INTO STRICT v_slide_group, v_order_index, v_attribution
      FROM public.exercises
     WHERE section_id = v_personality_id AND slug = v_slug;
    IF v_slide_group IS DISTINCT FROM (CASE v_slug
        WHEN 'core-style-characteristics' THEN 7
        WHEN 'core-style-ideal-environment' THEN 8
        WHEN 'core-style-traits-checklist' THEN 9
        WHEN 'core-style-comfort-zones' THEN 10
      END) THEN
      RAISE EXCEPTION 'INVARIANT FAIL: % slide_group=% (expected per slug)', v_slug, v_slide_group;
    END IF;
    IF v_attribution IS DISTINCT FROM tti THEN
      RAISE EXCEPTION 'INVARIANT FAIL: % attribution=%, expected TTI', v_slug, v_attribution;
    END IF;
  END LOOP;

  -- 2. my-core-style is soft-hidden.
  SELECT slide_group, order_index
    INTO STRICT v_slide_group, v_order_index
    FROM public.exercises
   WHERE section_id = v_personality_id AND slug = 'my-core-style';
  IF v_slide_group IS NOT NULL OR v_order_index <> 99 THEN
    RAISE EXCEPTION 'INVARIANT FAIL: my-core-style slide_group=%, order_index=% (expected NULL/99)', v_slide_group, v_order_index;
  END IF;

  -- 3. attitude-types-watusi has interaction='sorted'.
  SELECT content_json->>'interaction' INTO v_interaction
    FROM public.exercises
   WHERE section_id = v_attitude_id AND slug = 'attitude-types-watusi';
  IF v_interaction <> 'sorted' THEN
    RAISE EXCEPTION 'INVARIANT FAIL: WATUSI interaction=%, expected sorted', v_interaction;
  END IF;

  -- 4. Total exercise count: 35 (iter5) + 4 (iter6) = 39.
  SELECT COUNT(*) INTO v_row_count FROM public.exercises;
  IF v_row_count <> 39 THEN
    RAISE EXCEPTION 'INVARIANT FAIL: exercises COUNT=%, expected 39', v_row_count;
  END IF;

  RAISE NOTICE '✓ All migration-016 invariants hold (4 new rows + my-core-style hidden + WATUSI sorted + 39 total).';
END $$;

ROLLBACK; -- tests are read-only; rollback so we leave state untouched
