-- db/migrations/031_deck_slide_layout_adjustments.sql
--
-- Migration 031: Layout adjustments for opening and personality slides.
--
-- Changes:
--   1. Slide 3 (opening-select-hr)       — Adds "tagline": "In Search of Heart" to the content_json.
--   2. Slides 12-19 (personality-*)      — Re-orders slides so all four profiles (D, I, S, C) appear first,
--                                          followed by comfort zones.
--   3. Comfort zones merged              — 4 comfort zone slides replaced by 2 comfort-zones-pair slides.
--                                          personality-comfort-zones-[d,i,s,c] deleted.
--                                          personality-comfort-zones-di inserted at order_index 150.
--                                          personality-comfort-zones-sc inserted at order_index 160.
--   4. Four styles guide moved           — personality-four-styles order_index bumped to 170.

BEGIN;

-- 0. Widen the check constraint to allow new kinds:
--    'comfort-zones-pair' (added in this migration)
--    'attitude-conflict-matrix' (added in 030 migration)
ALTER TABLE public.deck_slides DROP CONSTRAINT IF EXISTS deck_slides_kind_check;
ALTER TABLE public.deck_slides ADD CONSTRAINT deck_slides_kind_check
  CHECK (kind IN (
    'cover', 'section-title', 'quote', 'statement', 'bullets',
    'two-col', 'disc-profile', 'comfort-zones', 'comfort-zones-pair',
    'numbered-list', 'image', 'contact', 'attitude-conflict-matrix'
  ));

-- 1. Add "tagline": "In Search of Heart" to the Select HR slide
UPDATE public.deck_slides
   SET content_json = jsonb_set(
         content_json,
         '{tagline}',
         '"In Search of Heart"'
       ),
       updated_at = now()
 WHERE slug = 'opening-select-hr';

-- 2. Update order_index for the 4 disc-profile slides to keep them consecutive
UPDATE public.deck_slides SET order_index = 110, updated_at = now() WHERE slug = 'personality-high-d';
UPDATE public.deck_slides SET order_index = 120, updated_at = now() WHERE slug = 'personality-high-i';
UPDATE public.deck_slides SET order_index = 130, updated_at = now() WHERE slug = 'personality-high-s';
UPDATE public.deck_slides SET order_index = 140, updated_at = now() WHERE slug = 'personality-high-c';

-- 3a. Delete the old 4 comfort zone slides
DELETE FROM public.deck_slides
 WHERE slug IN (
   'personality-comfort-zones-d',
   'personality-comfort-zones-i',
   'personality-comfort-zones-s',
   'personality-comfort-zones-c'
 );

-- 3b. Insert the two new comfort-zones-pair slides
INSERT INTO public.deck_slides
  (slug, kind, chapter, order_index, content_json, linked_exercise_slugs)
VALUES (
  'personality-comfort-zones-di',
  'comfort-zones-pair',
  'personality',
  150,
  $json${
    "caption": "Adapted with permission from How To Read and Understand People © 1988 Target Training International",
    "left": {
      "style": "D",
      "title": "Comfort Zones — HIGH D",
      "pairs": [
        { "other": "D", "level": "moderate", "text": "Though both have the same approach toward life, their tendency to challenge and need to have their own way reduces their Comfort Zone." },
        { "other": "I", "level": "high", "text": "Both are extroverted. I's verbal skills and people orientation allow a wider Comfort Zone for interaction." },
        { "other": "S", "level": "low", "text": "Low Comfort Zone due to dissimilar personalities. S's tendency to back down from D's strong assertive style frustrates both parties." },
        { "other": "C", "level": "low", "text": "D's need for immediate results clashes with C's drive to analyse and test the water first." }
      ]
    },
    "right": {
      "style": "I",
      "title": "Comfort Zones — HIGH I",
      "pairs": [
        { "other": "D", "level": "high", "text": "Both are extroverted. I's verbal skills and people orientation allow a wider Comfort Zone for interaction." },
        { "other": "I", "level": "very-high", "text": "High Comfort Zone is maximized by their enjoyment of and need for personal interaction." },
        { "other": "S", "level": "moderate", "text": "Though both are people oriented, S's social conscience may irritate I, and S may perceive I as unfeeling." },
        { "other": "C", "level": "high", "text": "I's people skills and their high trust threshold relaxes C's need to establish rationale for trust." }
      ]
    }
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
  'personality-comfort-zones-sc',
  'comfort-zones-pair',
  'personality',
  160,
  $json${
    "caption": "Adapted with permission from How To Read and Understand People © 1988 Target Training International",
    "left": {
      "style": "S",
      "title": "Comfort Zones — HIGH S",
      "pairs": [
        { "other": "D", "level": "low", "text": "Low Comfort Zone due to dissimilar personalities. S's tendency to back down from D's strong assertive style frustrates both parties." },
        { "other": "I", "level": "moderate", "text": "Though both are people oriented, S's social conscience may irritate I, and S may perceive I as unfeeling." },
        { "other": "S", "level": "very-high", "text": "Similar opinions and their high tolerance and sociability create a very high Comfort Zone." },
        { "other": "C", "level": "high", "text": "S's high respect for others and tolerance of differences allow them to approach C without alarming C's introverted response." }
      ]
    },
    "right": {
      "style": "C",
      "title": "Comfort Zones — HIGH C",
      "pairs": [
        { "other": "D", "level": "low", "text": "D's need for immediate results clashes with C's drive to analyse and test the water first." },
        { "other": "I", "level": "high", "text": "I's people skills and their high trust threshold relaxes C's need to establish rationale for trust." },
        { "other": "S", "level": "high", "text": "S's high respect for others and tolerance of differences allow them to approach C without alarming C's introverted response." },
        { "other": "C", "level": "high", "text": "Respect for rules and established protocol and their desire to avoid conflict create a High Comfort Zone." }
      ]
    }
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

-- 4. Move four-styles summary slide to the end of the personality section
UPDATE public.deck_slides
   SET order_index = 170,
       updated_at = now()
 WHERE slug = 'personality-four-styles';

COMMIT;
