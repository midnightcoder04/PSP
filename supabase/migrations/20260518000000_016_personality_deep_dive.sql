-- db/migrations/016_personality_deep_dive.sql
--
-- Migration 016: Personality matched-style deep-dive (4 new exercises) +
-- soft-hide my-core-style + flip WATUSI ranking to interaction='sorted'.
--
-- See specs/006-iter6-personality-watusi-polish/contracts/migration-016.md
-- for the contract this migration implements.
--
-- AUTO-GENERATED from db/seeds/course-content.json by
-- scripts/build-migration-016.ts. Do not edit by hand — edit the seed and
-- re-run `tsx scripts/build-migration-016.ts`.
--
-- Idempotent: re-running produces zero diff. responses.exercise_id FK is NOT
-- ON DELETE CASCADE per migration 004, so the explicit DELETE in step 1 is
-- required on re-run (no-op on first run when the rows don't yet exist).

BEGIN;

-- 1. DELETE responses tied to the 4 NEW exercises (safety on re-run).
DELETE FROM public.responses
WHERE exercise_id IN (
  SELECT id FROM public.exercises
  WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'personality')
    AND slug IN (
      'core-style-characteristics',
      'core-style-ideal-environment',
      'core-style-traits-checklist',
      'core-style-comfort-zones'
    )
);

-- 2. DELETE the 4 NEW exercise rows (idempotent on re-run).
DELETE FROM public.exercises
WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'personality')
  AND slug IN (
    'core-style-characteristics',
    'core-style-ideal-environment',
    'core-style-traits-checklist',
    'core-style-comfort-zones'
  );

-- 3. UPSERT the 4 NEW exercise rows.
INSERT INTO public.exercises
  (section_id, slug, title, type, order_index, slide_group, is_scored, attribution, content_json)
VALUES
  ((SELECT id FROM public.sections WHERE slug = 'personality'), 'core-style-characteristics', 'Characteristics of Your Core Style', 'info', 9, 7, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', $json${"content":"Answer the two questions on the quiz slide to see your matched style's characteristics here.","computed":"core_style_section","computed_inputs":["core-style-q1-extroversion","core-style-q2-orientation"],"sections_by_style":{"D":"If you are HIGH D, you are:\n• Able to make decisions quickly\n• Willing to state unpopular opinions\n• Risk taking","I":"If you are HIGH I, you:\n• Are a natural optimist\n• Trusting of others\n• Able to make others feel welcome and/or included","S":"If you are HIGH S, you:\n• Have a tenacity for order\n• Possess a natural ability to organize tasks","C":"If you are HIGH C, you:\n• Are a natural systems developer\n• Are a good quality control person\n• Are willing to dig for information"}}$json$::jsonb),
  ((SELECT id FROM public.sections WHERE slug = 'personality'), 'core-style-ideal-environment', 'Your Ideal Environment', 'info', 10, 8, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', $json${"content":"Answer the two questions on the quiz slide to see your matched style's ideal environment here.","computed":"core_style_section","computed_inputs":["core-style-q1-extroversion","core-style-q2-orientation"],"sections_by_style":{"D":"Ideal environment for the HIGH D:\n• Freedom from controls, supervision and details\n• Evaluation based on results, not process or method\n• An innovative and futuristic oriented environment\n• Non-routine work with challenge and opportunity\n• A forum for them to express their ideas and viewpoints","I":"Ideal environment for the HIGH I:\n• Assignments with a high degree of people contacts\n• Tasks involving motivating groups and establishing a network of contacts\n• Democratic supervisor with whom they can associate\n• Freedom from control and detail\n• Freedom of movement\n• Multi-changing work tasks","S":"Ideal environment for the HIGH S:\n• Jobs for which standards and methods are established\n• Environment where long standing relationships can be or are developed\n• Personal attention and recognition for tasks complete and well done\n• Stable and predictable environment\n• Environment that allows time for change\n• Environment where people can be dealt with on a personal, intimate basis","C":"Ideal environment for the HIGH C:\n• Where critical thinking is needed and rewarded\n• Assignments can be followed through to completion\n• Technical, task-oriented work, specialized\n• Noise and people are at a minimum\n• Close relationship with a small group of people\n• Environment where quality and/or standards are important"}}$json$::jsonb),
  ((SELECT id FROM public.sections WHERE slug = 'personality'), 'core-style-traits-checklist', 'Your Characteristics Checklist (Optional)', 'checkbox', 11, 9, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', $json${"prompt":"Tick the characteristics that resonate with you. This is optional — you can move on without ticking any.","allow_multiple":true,"computed":"core_style_options","computed_inputs":["core-style-q1-extroversion","core-style-q2-orientation"],"options_by_style":{"D":[{"id":"d_t1","label":"Ambitious"},{"id":"d_t2","label":"Forceful"},{"id":"d_t3","label":"Decisive"},{"id":"d_t4","label":"Direct"},{"id":"d_t5","label":"Independent"},{"id":"d_t6","label":"Challenging"},{"id":"d_t7","label":"Results oriented"},{"id":"d_t8","label":"I have a desire to win"},{"id":"d_t9","label":"Argumentative"},{"id":"d_t10","label":"Fast paced"},{"id":"d_t11","label":"I tend to juggle a lot at once"},{"id":"d_t12","label":"I am quick to accept challenge"},{"id":"d_t13","label":"I usually interrupt and am impatient with long explanations"},{"id":"d_t14","label":"I tend to act or speak before thinking"},{"id":"d_t15","label":"I am not afraid of high risk"},{"id":"d_t16","label":"I tend to create fear in others"},{"id":"d_t17","label":"I tend to be impatient"}],"I":[{"id":"i_t1","label":"Expressive"},{"id":"i_t2","label":"Enthusiastic"},{"id":"i_t3","label":"Friendly"},{"id":"i_t4","label":"Demonstrative"},{"id":"i_t5","label":"Talkative"},{"id":"i_t6","label":"Stimulating"},{"id":"i_t7","label":"I have a good sense of humor"},{"id":"i_t8","label":"I treat everyone as a friend"},{"id":"i_t9","label":"I am fun loving"},{"id":"i_t10","label":"I am a creative problem solver"},{"id":"i_t11","label":"I am usually very optimistic"},{"id":"i_t12","label":"I tend to talk before thinking"},{"id":"i_t13","label":"I very often lose track of time"},{"id":"i_t14","label":"I prefer to back away from conflict"},{"id":"i_t15","label":"I tend to be disorganized"},{"id":"i_t16","label":"I am very trusting of others"}],"S":[{"id":"s_t1","label":"Methodical"},{"id":"s_t2","label":"Systematic"},{"id":"s_t3","label":"Reliable"},{"id":"s_t4","label":"Steady"},{"id":"s_t5","label":"Relaxed"},{"id":"s_t6","label":"Modest"},{"id":"s_t7","label":"I need secure situations"},{"id":"s_t8","label":"I'm a good planner"},{"id":"s_t9","label":"I need closure"},{"id":"s_t10","label":"I'm a great listener"},{"id":"s_t11","label":"I am usually calm and stabilize others"},{"id":"s_t12","label":"I mask my emotions"},{"id":"s_t13","label":"I tend to be indirect to avoid conflict"},{"id":"s_t14","label":"I tend to be possessive of things"},{"id":"s_t15","label":"I tend to be too low risk"},{"id":"s_t16","label":"I tend to hold a grudge"},{"id":"s_t17","label":"I tend to adapt very quickly to others"},{"id":"s_t18","label":"I tend to resist changes"}],"C":[{"id":"c_t1","label":"Analytical"},{"id":"c_t2","label":"Contemplative"},{"id":"c_t3","label":"Conservative"},{"id":"c_t4","label":"Exacting"},{"id":"c_t5","label":"Careful"},{"id":"c_t6","label":"Deliberate"},{"id":"c_t7","label":"I like to organize and analyze"},{"id":"c_t8","label":"I work well alone"},{"id":"c_t9","label":"I have high expectations"},{"id":"c_t10","label":"I like to follow rules"},{"id":"c_t11","label":"I am self-competitive"},{"id":"c_t12","label":"I can solve complex problems"},{"id":"c_t13","label":"I live my life by rules of behaving"},{"id":"c_t14","label":"I tend to want as much data as possible"},{"id":"c_t15","label":"I tend to be hard on myself"},{"id":"c_t16","label":"I never take unnecessary chances"},{"id":"c_t17","label":"I tend to feel emotions are very irrational"},{"id":"c_t18","label":"I tend to see faults in others"},{"id":"c_t19","label":"I tend to analyze things to death"}]}}$json$::jsonb),
  ((SELECT id FROM public.sections WHERE slug = 'personality'), 'core-style-comfort-zones', 'Your Comfort Zones', 'info', 12, 10, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', $json${"content":"Answer the two questions on the quiz slide to see how your matched style interacts with each of the others.","computed":"core_style_section","computed_inputs":["core-style-q1-extroversion","core-style-q2-orientation"],"sections_by_style":{"D":"Comfort Zones for HIGH D:\n• D ↔ D: Though both have the same approach toward life, their tendency to challenge and need to have their own way reduces their Comfort Zone.\n• D ↔ I: Both are extroverted. I's verbal skills and people orientation allow a wider Comfort Zone for interaction.\n• D ↔ S: Low Comfort Zone due to dissimilar personalities. S's tendency to back down from D's strong assertive style frustrates both parties.\n• D ↔ C: D's need for immediate results clashes with C's drive to analyse and test the water first.","I":"Comfort Zones for HIGH I:\n• I ↔ D: Both are extroverted. I's verbal skills and people orientation allow a wider Comfort Zone for interaction.\n• I ↔ I: High Comfort Zone is maximized by their enjoyment of and need for personal interaction.\n• I ↔ S: Though both are people oriented, S's social conscience may irritate I, and S may perceive I as unfeeling.\n• I ↔ C: I's people skills and their high trust threshold relaxes C's need to establish rationale for trust.","S":"Comfort Zones for HIGH S:\n• S ↔ D: Low Comfort Zone due to dissimilar personalities. S's tendency to back down from D's strong assertive style frustrates both parties.\n• S ↔ I: Though both are people oriented, S's social conscience may irritate I, and S may perceive I as unfeeling.\n• S ↔ S: Similar opinions and their high tolerance and sociability create a very high Comfort Zone.\n• S ↔ C: S's high respect for others and tolerance of differences allow them to approach C without alarming C's introverted response.","C":"Comfort Zones for HIGH C:\n• C ↔ D: D's need for immediate results clashes with C's drive to analyse and test the water first.\n• C ↔ I: I's people skills and their high trust threshold relaxes C's need to establish rationale for trust.\n• C ↔ S: S's high respect for others and tolerance of differences allow them to approach C without alarming C's introverted response.\n• C ↔ C: Respect for rules and established protocol and their desire to avoid conflict create a High Comfort Zone."}}$json$::jsonb)
ON CONFLICT (section_id, slug) DO UPDATE
SET title        = EXCLUDED.title,
    type         = EXCLUDED.type,
    order_index  = EXCLUDED.order_index,
    slide_group  = EXCLUDED.slide_group,
    is_scored    = EXCLUDED.is_scored,
    attribution  = EXCLUDED.attribution,
    content_json = EXCLUDED.content_json,
    updated_at   = now();

-- 4. Soft-hide my-core-style: slide_group=NULL excludes it from the rendered
--    slide track, order_index=99 sorts it last. Responses untouched.
UPDATE public.exercises
   SET slide_group = NULL,
       order_index = 99,
       updated_at  = now()
 WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'personality')
   AND slug = 'my-core-style';

-- 5. Flip attitude-types-watusi to interaction='sorted' (read-only sorted listing).
UPDATE public.exercises
   SET content_json = jsonb_set(content_json, '{interaction}', '"sorted"'::jsonb),
       updated_at   = now()
 WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'attitude')
   AND slug = 'attitude-types-watusi';

COMMIT;
