-- db/migrations/030_deck_slide_content_enhancements.sql
--
-- Migration 030: Five content enhancements to the presenter deck (iter7).
--
-- Changes:
--   1. Slide 9  (personality-disc)        — credit Bill J. Bonnstetter / TTI in caption.
--   2. Slide 20 (personality-four-styles) — add subtitle "Reference guide — adjectives for each style".
--   3. After slide 29 (attitudes-f)       — insert new attitude-conflict-matrix slide (order_index 275).
--   4. Slides 31-34 (values-shopping-*)   — add values-shop.png image field.
--   5. Values definitions                 — replace values-definitions-1 + values-definitions-2 with
--                                           a single two-col slide (values-definitions, order_index 360).
--
-- Idempotent: re-running produces zero net diff (UPDATE/UPSERT pattern).
-- No existing responses are affected (deck_slides has no cascade to responses).

BEGIN;

-- ── 0. Widen the check constraint to allow the new 'attitude-conflict-matrix'
--      kind inserted below (also re-applied, idempotently, in migration 031
--      alongside 'comfort-zones-pair').
ALTER TABLE public.deck_slides DROP CONSTRAINT IF EXISTS deck_slides_kind_check;
ALTER TABLE public.deck_slides ADD CONSTRAINT deck_slides_kind_check
  CHECK (kind IN (
    'cover', 'section-title', 'quote', 'statement', 'bullets',
    'two-col', 'disc-profile', 'comfort-zones', 'comfort-zones-pair',
    'numbered-list', 'image', 'contact', 'attitude-conflict-matrix'
  ));

-- ── 1. Credit Bill J. Bonnstetter / TTI on personality-disc ─────────────────
UPDATE public.deck_slides
   SET content_json = jsonb_set(
         content_json,
         '{caption}',
         '"Dominance · Influence · Steadiness · Compliance\nDeveloped by Bill J. Bonnstetter · Target Training International (TTI) · Phoenix, Arizona"'
       ),
       updated_at = now()
 WHERE slug = 'personality-disc';

-- ── 2. Add subtitle to personality-four-styles ───────────────────────────────
UPDATE public.deck_slides
   SET content_json = jsonb_set(
         content_json,
         '{subtitle}',
         '"Reference guide — adjectives for each style"'
       ),
       updated_at = now()
 WHERE slug = 'personality-four-styles';

-- ── 3. Insert (or upsert) the attitude-conflict-matrix slide ─────────────────
INSERT INTO public.deck_slides
  (slug, kind, chapter, order_index, content_json, linked_exercise_slugs, notes)
VALUES (
  'attitudes-conflict-matrix',
  'attitude-conflict-matrix',
  'attitudes',
  275,
  $json${
    "title": "Attitude Conflict Matrix",
    "subtitle": "How each pair of attitudes interacts — darkened areas indicate value conflicts",
    "caption": "Adapted with permission from How To Read and Understand People © 1988 Target Training International · Based on Eduard Spranger, Types of Men (1928)",
    "labels": {
      "W": "Theoretical",
      "A": "Aesthetic",
      "T": "Traditional",
      "U": "Utilitarian",
      "S": "Social",
      "I": "Individualistic"
    },
    "cells": [
      "Objective discussion and search for truth through gaining information.",
      "Objective truth clashes with subjective aesthetic view.",
      "Cognition does not create values. Everything must be explained rationally. Faith is rejected as unprovable.",
      "Search for truth may conflict with utility. Theoretical is not concerned with the practical.",
      "Self and knowledge may clash with other-oriented viewpoint.",
      "Discovery of truth may be crucial to establishing position.",
      "Objective truth clashes with subjective aesthetic view.",
      "Focus is on subjective form, harmony and beauty.",
      "The beauty side of the totality of life is embraced, but the negative aspects of many religions is rejected.",
      "The useful may be hurtful to the beautiful. Utility may oppose form and beauty.",
      "Social is the focus on others. Aesthetic is more focused on individual fulfillment.",
      "Form and Harmony may block position. Yet position as expressed by beauty and form, owning beautiful things.",
      "Cognition does not create values. Everything must be explained rationally. Faith is rejected as unprovable.",
      "The beauty side of the totality of life is embraced, but the negative aspects of many religions is rejected.",
      "When agreed, the result is unity of purpose. When opposed, watch out!",
      "Tradition may view utilitarian focus as good or evil. Could go either way.",
      "Reverence for each individual unifies both attitudes.",
      "Totality of life. A religious viewpoint is a tool to guide people.",
      "Search for truth may conflict with utility. Theoretical is not concerned with the practical.",
      "The useful may be hurtful to the beautiful. Utility may oppose form and beauty.",
      "Tradition may view utilitarian focus as good or evil. Could go either way.",
      "Utilitarianism in all areas of life may be competing with pursuit of gain.",
      "Preservation of self first is opposed to empathy with others.",
      "Wealth is power. Utility leads to control.",
      "Self and knowledge may clash with other-oriented viewpoint.",
      "Social is the focus on others. Aesthetic is more focused on individual fulfillment.",
      "Reverence for each individual unifies both attitudes.",
      "Preservation of self first is opposed to empathy with others.",
      "Both focus on others and efforts are combined to achieve progress.",
      "Focus on others opposes self positioning; focus on others is necessary for self positioning.",
      "Discovery of truth may be crucial to establishing position.",
      "Form and Harmony may block position. Yet position as expressed by beauty and form, owning beautiful things.",
      "Totality of life. A religious viewpoint is a tool to guide people.",
      "Wealth is power. Utility leads to control.",
      "Focus on others opposes self positioning; focus on others is necessary for self positioning.",
      "Jockeying for position. Ultra Competitive!"
    ]
  }$json$::jsonb,
  '{}'::text[],
  'Facilitate a discussion: which conflict resonates most with participants? Use the matrix to spark insight about internal tensions between their top two attitudes.'
)
ON CONFLICT (slug) DO UPDATE
  SET kind               = EXCLUDED.kind,
      chapter            = EXCLUDED.chapter,
      order_index        = EXCLUDED.order_index,
      content_json       = EXCLUDED.content_json,
      linked_exercise_slugs = EXCLUDED.linked_exercise_slugs,
      notes              = EXCLUDED.notes,
      updated_at         = now();

-- ── 4. Add values-shop.png image to the four Values Shopping Spree slides ────
UPDATE public.deck_slides
   SET content_json = jsonb_set(content_json, '{image}', '"/deck/values-shop.png"'),
       updated_at   = now()
 WHERE slug IN ('values-shopping-1', 'values-shopping-2', 'values-shopping-3', 'values-shopping-4');

-- ── 5a. Delete the two old values-definitions slides ─────────────────────────
DELETE FROM public.deck_slides
 WHERE slug IN ('values-definitions-1', 'values-definitions-2');

-- ── 5b. Insert the single combined values-definitions slide ──────────────────
INSERT INTO public.deck_slides
  (slug, kind, chapter, order_index, content_json, linked_exercise_slugs)
VALUES (
  'values-definitions',
  'two-col',
  'values',
  360,
  $json${
    "title": "Value Definitions",
    "subtitle": "Reference — all 17 values at a glance",
    "columns": [
      {
        "heading": "",
        "bullets": [
          "Justice — Moral rightness, honor, fairness",
          "Humanitarianism — Devotion to the promotion of human welfare",
          "Recognition — Acknowledgment of one's significance or importance",
          "Achievement — Accomplishment",
          "Pleasure — Enjoyment, satisfaction, satiation",
          "Wisdom — Understanding of what is true, right or lasting",
          "Honesty — Straightforwardness, integrity, consistency",
          "Autonomy — Independence, self-containment",
          "Economy — Abundance of material possessions, wealth"
        ]
      },
      {
        "heading": "",
        "bullets": [
          "Power — Control, authority or influence",
          "Love — Affection, warm attachment, caring",
          "Aesthetics — Appreciation and enjoyment of beauty for beauty's sake",
          "Physical Attractiveness — Concern for the appearance of one's body",
          "Health — Concern for the health of one's body",
          "Feeling of Well-Being — Freedom from anxiety, imbalance; peace of mind",
          "Knowledge — Seeking of truth and/or information",
          "Spiritual Well-Being — Communion with, obedience to, and activity on behalf of a Supreme Being"
        ]
      }
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

COMMIT;
