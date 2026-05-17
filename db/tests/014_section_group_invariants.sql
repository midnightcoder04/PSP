-- db/tests/014_section_group_invariants.sql
--
-- Migration 014 invariants test (specs/004-content-restructure).
--
-- RED proof (pre-014): expected to fail because the group_slug column does not exist.
-- GREEN proof (post-014): asserts the 9-section / 3-group / monotone-order invariant.
--
-- Mirrors the 013-from-Iter-3 convention (RED/GREEN proof in header).

DO $$
DECLARE
  r RECORD;
  prev_order int := 0;
  prev_group_order int := 0;
  group_order_map jsonb := '{"self-awareness":1,"goal-setting":2,"strategic-planning":3}'::jsonb;
  v_section_count int;
  v_group_count int;
BEGIN
  -- I1: section + group counts
  SELECT COUNT(*) INTO v_section_count FROM public.sections;
  IF v_section_count <> 9 THEN
    RAISE EXCEPTION 'I1: expected 9 sections, got %', v_section_count;
  END IF;

  SELECT COUNT(DISTINCT group_slug) INTO v_group_count FROM public.sections;
  IF v_group_count <> 3 THEN
    RAISE EXCEPTION 'I1: expected 3 distinct group_slug values, got %', v_group_count;
  END IF;

  -- I1: per-group distribution
  IF (SELECT COUNT(*) FROM public.sections WHERE group_slug = 'self-awareness') <> 5 THEN
    RAISE EXCEPTION 'I1: expected 5 sections in self-awareness';
  END IF;
  IF (SELECT COUNT(*) FROM public.sections WHERE group_slug = 'goal-setting') <> 3 THEN
    RAISE EXCEPTION 'I1: expected 3 sections in goal-setting';
  END IF;
  IF (SELECT COUNT(*) FROM public.sections WHERE group_slug = 'strategic-planning') <> 1 THEN
    RAISE EXCEPTION 'I1: expected 1 section in strategic-planning';
  END IF;

  -- I2: monotone ordering of (group_order, order_index)
  FOR r IN
    SELECT slug, order_index, group_slug FROM public.sections ORDER BY order_index
  LOOP
    IF (group_order_map ->> r.group_slug)::int < prev_group_order THEN
      RAISE EXCEPTION 'I2: % at order_index=% in group % comes before earlier group',
        r.slug, r.order_index, r.group_slug;
    END IF;
    prev_group_order := (group_order_map ->> r.group_slug)::int;

    IF r.order_index <= prev_order THEN
      RAISE EXCEPTION 'I2: % has order_index=% but previous row had %',
        r.slug, r.order_index, prev_order;
    END IF;
    prev_order := r.order_index;
  END LOOP;

  -- I3: canonical slug sequence
  IF (
    SELECT array_agg(slug ORDER BY order_index)
    FROM public.sections
  ) <> ARRAY[
    'personality','attitude','values','roles-and-demands','transferable-skills',
    'specific-goals','goal-impact-matrix','visualization',
    'removing-obstacles-achieving-goals'
  ]::text[] THEN
    RAISE EXCEPTION 'I3: section slug sequence does not match the canonical 9-slug array';
  END IF;

  -- Data-wipe invariants from US4
  IF (SELECT COUNT(*) FROM public.responses) <> 0 THEN
    RAISE EXCEPTION 'US4: expected responses to be wiped';
  END IF;
  IF (SELECT COUNT(*) FROM public.progress) <> 0 THEN
    RAISE EXCEPTION 'US4: expected progress to be wiped';
  END IF;

  RAISE NOTICE 'GREEN: 9 sections, 3 groups, monotone order, slug sequence, wipes verified';
END $$;
