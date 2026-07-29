-- Migration 039: authored Leadership Development deck inserts
--
-- Migration 036 seeded two *demo* discussion inserts for leadership-development
-- ("so the flow is visible out of the box") and migration 037 deliberately left
-- them untouched while authoring the other 14 topics. The facilitator has now
-- supplied the real Leadership framing for the Personality, Attitudes and
-- Values chapters, so this migration replaces those two placeholders and adds
-- the missing Values insert.
--
-- The personality/attitudes rows are updated unconditionally: they were
-- explicitly placeholder content, and this is the material that supersedes it.
-- The values row uses the same idempotent INSERT ... WHERE NOT EXISTS pattern
-- as 036/037 so an admin who has already authored one is not clobbered.
--
-- IP compliance: as with 036/037, this is generic corporate soft-skills
-- facilitation guidance authored for this platform. It is NOT part of the
-- Personal Strategic Planning™ workbook (Sam Koshy / Compass Career Life
-- Solutions) or the D.I.S.C. material (Target Training International).

-- ── personality: what kind of leader are you? ──────────────────────────────

UPDATE public.topic_segments s
SET content_json = jsonb_build_object(
      'title', 'Discuss: what kind of leader are you?',
      'questions', jsonb_build_array(
        'What kind of leader are you? How would you describe your leadership style?',
        'Ask the others in the room how they read your style and approach — does it match your own reading?',
        'As a leader (or a future leader), how are you going to handle each of the four personality styles?',
        'Share your thinking with the group so everyone can learn from it.',
        'How can you apply this learning effectively in your personal life?'))
FROM public.training_topics t
WHERE s.topic_id = t.id
  AND t.slug = 'leadership-development'
  AND s.chapter = 'personality'
  AND s.kind = 'discussion';

-- ── attitudes: attitudes are motivations ───────────────────────────────────

UPDATE public.topic_segments s
SET content_json = jsonb_build_object(
      'title', 'Discuss: attitudes are motivations',
      'questions', jsonb_build_array(
        'Attitudes are motivations. Look at your own attitudes — what do they tell you about what motivates you?',
        'Read the attitudes of others in the room and discuss: what motivates them?',
        'As a leader (or a future leader), how are you going to lead through these different attitudes to get things done?',
        'How can you apply this learning effectively in your personal life?'))
FROM public.training_topics t
WHERE s.topic_id = t.id
  AND t.slug = 'leadership-development'
  AND s.chapter = 'attitudes'
  AND s.kind = 'discussion';

-- ── values: the values behind your decisions ───────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'values', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: the values behind your decisions',
         'questions', jsonb_build_array(
           'As a leader, how are your current values defining you?',
           'How are those values impacting the decisions you make?',
           'Read the values others have chosen and discuss where they differ from yours.',
           'As a leader, how are you going to deal with the various value types on your team?',
           'How can you apply this learning effectively in your personal life?')),
       10
FROM public.training_topics t
WHERE t.slug = 'leadership-development'
  AND NOT EXISTS (
    SELECT 1 FROM public.topic_segments s
    WHERE s.topic_id = t.id AND s.chapter = 'values' AND s.kind = 'discussion');
