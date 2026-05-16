-- db/migrations/015_personality_quiz.sql
--
-- Migration 015: Personality section reshape — two-question Core Style quiz
-- plus four DISC profile read-throughs (specs/005-iter5-ux-fixes).
--
-- See specs/005-iter5-ux-fixes/contracts/migration-015.md for the contract
-- this migration implements.
--
-- AUTO-GENERATED from db/seeds/course-content.json by
-- scripts/build-migration-015.ts. Do not edit by hand — edit the seed and
-- re-run `tsx scripts/build-migration-015.ts`.
--
-- DESTRUCTIVE: deletes 5 Personality exercise rows (identifying-personal-style
-- + 4 disc-core-style-*) and any responses cascade-FK'd to them.
-- Pre-production-safe per spec Assumption A-2 (user confirmation 2026-05-16).
--
-- Idempotent: re-running produces zero diff (DELETE allow-list + UPSERT).

BEGIN;

-- 1a. DELETE responses tied to the 5 removed exercises (the FK from
--     responses.exercise_id → exercises.id is NOT cascade per migration 004,
--     so we must scope the wipe explicitly).
DELETE FROM public.responses
WHERE exercise_id IN (
  SELECT id FROM public.exercises
  WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'personality')
    AND slug IN (
      'identifying-personal-style',
      'disc-core-style-d',
      'disc-core-style-i',
      'disc-core-style-s',
      'disc-core-style-c'
    )
);

-- 1b. DELETE the 5 removed exercise rows.
DELETE FROM public.exercises
WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'personality')
  AND slug IN (
    'identifying-personal-style',
    'disc-core-style-d',
    'disc-core-style-i',
    'disc-core-style-s',
    'disc-core-style-c'
  );

-- 2. UPSERT the post-migration row inventory (9 rows) per
--    specs/005-iter5-ux-fixes/contracts/personality-exercises.md.
INSERT INTO public.exercises
  (section_id, slug, title, type, order_index, slide_group, is_scored, attribution, content_json)
VALUES
  ((SELECT id FROM public.sections WHERE slug = 'personality'), 'disc-introduction', 'D.I.S.C. — Discovering My Personal Behavioural Design', 'info', 1, 1, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', $json${"content":"The D.I.S.C. MODEL was developed by Bill Bonnstetter at Target Training International, Phoenix, Arizona. It is based on the psychology of Carl Jung and William Moulton Marston and is widely accepted as an effective tool for enhancing performance in all areas of life.\n\nThrough the combined Nature/Nurture process of growing, you have developed specific ways of interacting with the world. This is your Personal Behavioural Style, or CORE STYLE.\n\nThe D.I.S.C. model uses four factors to determine behaviour:\n\n1. THE DOMINANCE FACTOR (D) — How you handle problems and challenges\n2. THE INFLUENCE FACTOR (I) — How you handle people and influence others\n3. THE STEADINESS FACTOR (S) — How you handle and pace yourself\n4. THE COMPLIANCE FACTOR (C) — How you handle the rules set by others\n\nHow you will benefit:\n• Increased Self Understanding\n• Increased Understanding of Others\n• Increased Communication Skills\n• Less Stress\n• Decreased Tension\n• Improved Relationships (Family, Work/Business, Social)","attribution":"(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)"}$json$::jsonb),
  ((SELECT id FROM public.sections WHERE slug = 'personality'), 'core-style-q1-extroversion', 'EXERCISE: Core Style — Question 1 (Extroversion)', 'checkbox', 2, 2, true, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', $json${"prompt":"Question 1: Are you predominantly EXTROVERTED or INTROVERTED?","options":[{"id":"q1_extroverted","label":"Extroverted — I gain energy from interacting with people and the outside world.","value":1},{"id":"q1_introverted","label":"Introverted — I gain energy from quiet reflection and my inner world.","value":1}],"allow_multiple":false}$json$::jsonb),
  ((SELECT id FROM public.sections WHERE slug = 'personality'), 'core-style-q2-orientation', 'EXERCISE: Core Style — Question 2 (Orientation)', 'checkbox', 3, 2, true, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', $json${"prompt":"Question 2: Are you predominantly PEOPLE-ORIENTED or TASK-ORIENTED?","options":[{"id":"q2_people","label":"People-oriented — I focus on relationships, collaboration, and how people feel.","value":1},{"id":"q2_task","label":"Task-oriented — I focus on results, structure, and getting things done.","value":1}],"allow_multiple":false}$json$::jsonb),
  ((SELECT id FROM public.sections WHERE slug = 'personality'), 'core-style-result', 'Your Core Style', 'info', 4, 3, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', $json${"content":"Based on your two answers, your Core Style maps to one of the four D.I.S.C. types per the workbook's mapping rule:\n\n1. Extroverted + Task-oriented = Core D — Dominance\n2. Extroverted + People-oriented = Core I — Influence\n3. Introverted + People-oriented = Core S — Steadiness\n4. Introverted + Task-oriented = Core C — Compliance\n\n{result}\n\nOn the next slides you'll read through each style's strengths, ideal environment, and comfort zones — not just your own. Knowing how other styles work makes every relationship easier.","computed":"core_style","computed_inputs":["core-style-q1-extroversion","core-style-q2-orientation"]}$json$::jsonb),
  ((SELECT id FROM public.sections WHERE slug = 'personality'), 'disc-profile-d', 'HIGH D — Dominance Profile', 'info', 5, 4, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', $json${"content":"HIGH D — Dominance\n\nIf you are HIGH D, you are able to make decisions quickly, willing to state unpopular opinions, and naturally risk-taking. You are direct, decisive, and results-oriented.\n\nIdeal environment\nYou thrive with freedom from controls, supervision and details. You prefer evaluation based on results — not process or method — and gravitate toward innovative, futuristic, non-routine work that gives you challenge and opportunity. You need a forum where you can express your ideas and viewpoints.\n\nCharacteristics\nAmbitious, forceful, decisive, direct, independent, challenging, results-oriented. You carry a strong desire to win, work at a fast pace, and tend to juggle several things at once. You are quick to accept a challenge, are not afraid of high risk, and may interrupt or speak before thinking. Others sometimes find your style impatient or fear-inducing — useful to know when you collaborate.\n\nComfort zone with other styles\n• With another D — the same approach, but your shared need to have your own way narrows the comfort zone.\n• With an I — both extroverted; the I's verbal skill and people focus widens interaction comfortably.\n• With an S — low comfort zone; the S tends to back down from your assertive style and both can feel frustrated.\n• With a C — your need for immediate results clashes with the C's drive to analyse and test first."}$json$::jsonb),
  ((SELECT id FROM public.sections WHERE slug = 'personality'), 'disc-profile-i', 'HIGH I — Influence Profile', 'info', 6, 4, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', $json${"content":"HIGH I — Influence\n\nIf you are HIGH I, you are a natural optimist, trusting of others, and able to make others feel welcome and included. You are expressive, enthusiastic, and persuasive.\n\nIdeal environment\nYou thrive on assignments with a high degree of people contact — motivating groups, building networks. You prefer a democratic supervisor you can associate with, freedom from control and detail, freedom of movement, and multi-changing work tasks.\n\nCharacteristics\nExpressive, enthusiastic, friendly, demonstrative, talkative, stimulating. You have a good sense of humour, treat everyone as a friend, are fun-loving and a creative problem solver. You are usually optimistic, may talk before thinking, sometimes lose track of time, prefer to back away from conflict, can tend toward disorganisation, and are very trusting of others.\n\nComfort zone with other styles\n• With a D — both extroverted; your verbal skills and people focus widen the comfort zone.\n• With another I — high comfort zone, maximised by mutual enjoyment of personal interaction.\n• With an S — both people-oriented, but the S's social conscience may irritate you, and the S may perceive you as unfeeling.\n• With a C — your people skills and high trust threshold relax the C's need to establish rationale for trust."}$json$::jsonb),
  ((SELECT id FROM public.sections WHERE slug = 'personality'), 'disc-profile-s', 'HIGH S — Steadiness Profile', 'info', 7, 5, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', $json${"content":"HIGH S — Steadiness\n\nIf you are HIGH S, you have a tenacity for order and a natural ability to organize tasks. You are steady, reliable, and calming to those around you.\n\nIdeal environment\nYou thrive in jobs where standards and methods are established, where long-standing relationships develop, and where you receive personal attention and recognition for tasks completed well. You prefer a stable, predictable environment that allows time for change, and where people can be dealt with on a personal, intimate basis.\n\nCharacteristics\nMethodical, systematic, reliable, steady, relaxed, modest. You need secure situations, are a good planner, need closure, and listen well. You usually stabilize others, may mask your emotions, tend to be indirect to avoid conflict, can be possessive of things, prefer low risk, occasionally hold a grudge, adapt quickly to others, and tend to resist changes.\n\nComfort zone with other styles\n• With a D — low comfort zone; you tend to back down from the D's assertive style and both can feel frustrated.\n• With an I — both people-oriented, but your social conscience may irritate the I, and you may perceive the I as unfeeling.\n• With another S — very high comfort zone; similar opinions plus high tolerance and sociability.\n• With a C — your high respect for others and tolerance of differences let you approach a C without alarming their introverted response."}$json$::jsonb),
  ((SELECT id FROM public.sections WHERE slug = 'personality'), 'disc-profile-c', 'HIGH C — Compliance Profile', 'info', 8, 5, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', $json${"content":"HIGH C — Compliance\n\nIf you are HIGH C, you are a natural systems developer, a good quality-control person, and willing to dig for information. You are analytical, careful, and precise.\n\nIdeal environment\nYou thrive where critical thinking is needed and rewarded, where assignments can be followed through to completion, in technical, task-oriented, specialized work. You prefer environments where noise and people are at a minimum, with close relationships among a small group, and where quality and standards matter.\n\nCharacteristics\nAnalytical, contemplative, conservative, exacting, careful, deliberate. You like to organize and analyse, work well alone, hold high expectations, follow rules, are self-competitive, and can solve complex problems. You like as much data as possible, are hard on yourself, never take unnecessary chances, may see emotions as irrational, tend to see faults in others, and can analyse things to death.\n\nComfort zone with other styles\n• With a D — the D's need for immediate results clashes with your drive to analyse first.\n• With an I — the I's people skills and high trust threshold relax your need to establish rationale for trust.\n• With an S — the S's respect for others and tolerance of differences let them approach you without alarming your introverted response.\n• With another C — high comfort zone; mutual respect for rules and protocol plus a shared desire to avoid conflict."}$json$::jsonb),
  ((SELECT id FROM public.sections WHERE slug = 'personality'), 'my-core-style', 'My Core Style — People Reading', 'text', 9, 6, false, NULL, $json${"prompt":"Based on the D.I.S.C. exercise above, what is your Core Style? Use the two-question method to confirm: (1) Am I predominantly EXTROVERTED or INTROVERTED? (2) Am I predominantly PEOPLE-ORIENTED or TASK-ORIENTED?\n\nExtroverted + Task-Oriented = Core D | Extroverted + People-Oriented = Core I | Introverted + People-Oriented = Core S | Introverted + Task-Oriented = Core C\n\nWrite your Core Style and reflect on how it shows up in your daily life:","placeholder":"My Core Style is ___ because...","min_length":10,"max_length":2000}$json$::jsonb)
ON CONFLICT (section_id, slug) DO UPDATE
SET title        = EXCLUDED.title,
    type         = EXCLUDED.type,
    order_index  = EXCLUDED.order_index,
    slide_group  = EXCLUDED.slide_group,
    is_scored    = EXCLUDED.is_scored,
    attribution  = EXCLUDED.attribution,
    content_json = EXCLUDED.content_json,
    updated_at   = now();

COMMIT;
