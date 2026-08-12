-- db/migrations/033_deck_personality_pages_and_attitude_order.sql
--
-- Migration 033: Give each DISC style its own two-page spread (matching
-- Course.pptx), expand the four-styles recap to the full profile, and swap
-- the Six Attitudes / Attitude Conflict Matrix order.
--
-- Changes:
--   1. Slides personality-high-[d,i,s,c] — strip "youAre"/"environment" from
--      content_json; those two arrays move to a new page-2 slide (page 1
--      keeps only adjectives + statements, matching Course.pptx's first
--      page per style).
--   2. New slides personality-high-[d,i,s,c]-detail inserted right after
--      each style's page 1 (order_index +5) — "If you are a HIGH x, you
--      are…" + "Ideal Environment for the HIGH x", carrying the youAre/
--      environment content that page 1 used to (silently) drop from view.
--   3. Slide personality-four-styles — each column's bullets now include
--      that style's full statements list, not just its adjectives, matching
--      the 2x2 grid on Course.pptx slide 19. Subtitle updated to match.
--   4. Slides attitudes-revealed / attitudes-conflict-matrix — swap
--      order_index (275 / 280) so the Attitude Conflict Matrix now follows
--      the Six Attitudes page instead of preceding it.
--
-- No CHECK constraint change needed — 'disc-profile' is an existing kind.
-- Idempotent: re-running produces zero net diff (UPDATE/UPSERT pattern).

BEGIN;

-- ── 1. Strip youAre/environment from the four page-1 disc-profile slides ──
UPDATE public.deck_slides
   SET content_json = content_json - 'youAre' - 'environment',
       updated_at = now()
 WHERE slug IN ('personality-high-d', 'personality-high-i', 'personality-high-s', 'personality-high-c');

-- ── 2. Insert (or upsert) the four page-2 "detail" slides ─────────────────
INSERT INTO public.deck_slides
  (slug, kind, chapter, order_index, content_json, linked_exercise_slugs)
VALUES (
  'personality-high-d-detail',
  'disc-profile',
  'personality',
  115,
  $json${
    "style": "D",
    "title": "HIGH D",
    "subtitle": "Extroverted + Task Oriented",
    "adjectives": [],
    "statements": [],
    "youAre": [
      "Able to make decisions quickly",
      "Willing to state unpopular opinions",
      "Risk taking"
    ],
    "environment": [
      "Freedom from controls, supervision and details",
      "Evaluation based on results, not process or method",
      "An innovative and futuristic oriented environment",
      "Non-routine work with challenge and opportunity",
      "A forum for them to express their ideas and viewpoints"
    ]
  }$json$::jsonb,
  '{}'::text[]
)
ON CONFLICT (slug) DO UPDATE
  SET kind               = EXCLUDED.kind,
      chapter            = EXCLUDED.chapter,
      order_index        = EXCLUDED.order_index,
      content_json       = EXCLUDED.content_json,
      linked_exercise_slugs = EXCLUDED.linked_exercise_slugs,
      updated_at         = now();

INSERT INTO public.deck_slides
  (slug, kind, chapter, order_index, content_json, linked_exercise_slugs)
VALUES (
  'personality-high-i-detail',
  'disc-profile',
  'personality',
  125,
  $json${
    "style": "I",
    "title": "HIGH I",
    "subtitle": "Extroverted + People Oriented",
    "adjectives": [],
    "statements": [],
    "youAre": [
      "A natural optimist",
      "Trusting of others",
      "Able to make others feel welcome and/or included"
    ],
    "environment": [
      "Assignments with a high degree of people contacts",
      "Tasks involving motivating groups and establishing a network of contacts",
      "Democratic supervisor with whom they can associate",
      "Freedom from control and detail",
      "Freedom of movement",
      "Multi-changing work tasks"
    ]
  }$json$::jsonb,
  '{}'::text[]
)
ON CONFLICT (slug) DO UPDATE
  SET kind               = EXCLUDED.kind,
      chapter            = EXCLUDED.chapter,
      order_index        = EXCLUDED.order_index,
      content_json       = EXCLUDED.content_json,
      linked_exercise_slugs = EXCLUDED.linked_exercise_slugs,
      updated_at         = now();

INSERT INTO public.deck_slides
  (slug, kind, chapter, order_index, content_json, linked_exercise_slugs)
VALUES (
  'personality-high-s-detail',
  'disc-profile',
  'personality',
  135,
  $json${
    "style": "S",
    "title": "HIGH S",
    "subtitle": "Introverted + People Oriented",
    "adjectives": [],
    "statements": [],
    "youAre": [
      "Have a tenacity for order",
      "Possess a natural ability to organize tasks"
    ],
    "environment": [
      "Jobs for which standards and methods are established",
      "Environment where long standing relationships can be or are developed",
      "Personal attention and recognition for tasks complete and well done",
      "Stable and predictable environment",
      "Environment that allows time for change",
      "Environment where people can be dealt with on a personal, intimate basis"
    ]
  }$json$::jsonb,
  '{}'::text[]
)
ON CONFLICT (slug) DO UPDATE
  SET kind               = EXCLUDED.kind,
      chapter            = EXCLUDED.chapter,
      order_index        = EXCLUDED.order_index,
      content_json       = EXCLUDED.content_json,
      linked_exercise_slugs = EXCLUDED.linked_exercise_slugs,
      updated_at         = now();

INSERT INTO public.deck_slides
  (slug, kind, chapter, order_index, content_json, linked_exercise_slugs)
VALUES (
  'personality-high-c-detail',
  'disc-profile',
  'personality',
  145,
  $json${
    "style": "C",
    "title": "HIGH C",
    "subtitle": "Introverted + Task Oriented",
    "adjectives": [],
    "statements": [],
    "youAre": [
      "A natural systems developer",
      "A good quality control person",
      "Willing to dig for information"
    ],
    "environment": [
      "Where critical thinking is needed and rewarded",
      "Assignments can be followed through to completion",
      "Technical, task-oriented work, specialized",
      "Noise and people are at a minimum",
      "Close relationship with a small group of people",
      "Environment where quality and/or standards are important"
    ]
  }$json$::jsonb,
  '{}'::text[]
)
ON CONFLICT (slug) DO UPDATE
  SET kind               = EXCLUDED.kind,
      chapter            = EXCLUDED.chapter,
      order_index        = EXCLUDED.order_index,
      content_json       = EXCLUDED.content_json,
      linked_exercise_slugs = EXCLUDED.linked_exercise_slugs,
      updated_at         = now();

-- ── 3. Expand personality-four-styles to the full profile per style ──────
UPDATE public.deck_slides
   SET content_json = $json${
         "title": "The Four Core Styles",
         "subtitle": "Reference guide — the full profile for each style",
         "columns": [
           {
             "heading": "HIGH D",
             "bullets": [
               "Ambitious", "Forceful", "Decisive", "Direct", "Independent", "Challenging", "Results oriented",
               "I have a desire to win", "Argumentative", "Fast paced", "I tend to juggle a lot at once",
               "I am quick to accept challenge", "I usually interrupt and am impatient with long explanations",
               "I tend to act or speak before thinking", "I am not afraid of high risk",
               "I tend to create fear in others", "I tend to be impatient"
             ]
           },
           {
             "heading": "HIGH I",
             "bullets": [
               "Expressive", "Enthusiastic", "Friendly", "Demonstrative", "Talkative", "Stimulating",
               "I have a good sense of humor", "I treat everyone as a friend", "I am fun loving",
               "I am a creative problem solver", "I am usually very optimistic", "I tend to talk before thinking",
               "I very often lose track of time", "I prefer to back away from conflict",
               "I tend to be disorganized", "I am very trusting of others"
             ]
           },
           {
             "heading": "HIGH S",
             "bullets": [
               "Methodical", "Systematic", "Reliable", "Steady", "Relaxed", "Modest",
               "I need secure situations", "I'm a good planner", "I need closure", "I'm a great listener",
               "I am usually calm and stabilize others", "I mask my emotions",
               "I tend to be indirect to avoid conflict", "I tend to be possessive of things",
               "I tend to be too low risk", "I tend to hold a grudge",
               "I tend to adapt very quickly to others", "I tend to resist changes"
             ]
           },
           {
             "heading": "HIGH C",
             "bullets": [
               "Analytical", "Contemplative", "Conservative", "Exacting", "Careful", "Deliberate",
               "I like to organize and analyze", "I work well alone", "I have high expectations",
               "I like to follow rules", "I am self-competitive", "I can solve complex problems",
               "I live my life by rules of behaving", "I tend to want as much data as possible",
               "I tend to be hard on myself", "I never take unnecessary chances",
               "I tend to feel emotions are very irrational", "I tend to see faults in others",
               "I tend to analyze things to death"
             ]
           }
         ]
       }$json$::jsonb,
       updated_at = now()
 WHERE slug = 'personality-four-styles';

-- ── 4. Swap Six Attitudes / Attitude Conflict Matrix order ────────────────
-- order_index is UNIQUE, so swap through a scratch value to avoid a
-- transient collision (275/280 -> 280/275 directly would collide mid-swap).
UPDATE public.deck_slides SET order_index = -1, updated_at = now() WHERE slug = 'attitudes-conflict-matrix';
UPDATE public.deck_slides SET order_index = 275, updated_at = now() WHERE slug = 'attitudes-revealed';
UPDATE public.deck_slides SET order_index = 280, updated_at = now() WHERE slug = 'attitudes-conflict-matrix';

COMMIT;
