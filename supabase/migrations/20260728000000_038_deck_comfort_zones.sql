-- Migration 038: comfort-zones deck slide kind
--
-- The personality chapter gains one "Comfort Zones for HIGH x" slide after each
-- HIGH D / I / S / C profile slide (order_index 120/140/160/180 — the gaps left
-- by 034). Each renders the style paired against all four core styles as
-- overlapping circles, sized by the shared Comfort Zone.
--
-- Content shape (deck_slides.content_json for kind = 'comfort-zones'):
--   { style: D|I|S|C, title, subtitle?, caption?,
--     pairs: [{ other: D|I|S|C, level: low|moderate|high|very-high, text }] }
--
-- Slide rows themselves come from db/seeds/deck-slides.json via
-- `npm run db:seed:deck`; this migration only widens the kind CHECK so those
-- inserts are accepted.

ALTER TABLE public.deck_slides DROP CONSTRAINT IF EXISTS deck_slides_kind_check;

ALTER TABLE public.deck_slides ADD CONSTRAINT deck_slides_kind_check
  CHECK (kind IN (
    'cover', 'section-title', 'quote', 'statement', 'bullets',
    'two-col', 'disc-profile', 'comfort-zones', 'numbered-list',
    'image', 'contact'));
