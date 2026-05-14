-- Migration 011: add slide_group column to exercises, extend type CHECK.
--
-- Iteration 4 (003-slide-nav-ux-rework):
-- * `slide_group` lets two exercises render on a single slide
--   (used by the WATUSI checklist + ranking pair). Default to NULL;
--   application code falls back to order_index when slide_group is NULL.
-- * Extend the type CHECK to allow two new exercise types:
--   - 'structured-text' (multi-question text exercise)
--   - 'rating-picker'   (N items × 1..5 radio group)
--
-- Backwards-compatible: existing rows keep their order_index-based layout;
-- the new types are not used by any existing row.

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS slide_group INT NULL;

-- Drop the old type CHECK (name may vary across migration history).
ALTER TABLE public.exercises
  DROP CONSTRAINT IF EXISTS exercises_type_check;

ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_type_check
  CHECK (type IN (
    'checkbox',
    'text',
    'table',
    'ranking',
    'info',
    'structured-text',
    'rating-picker'
  ));

COMMENT ON COLUMN public.exercises.slide_group IS
  'Optional grouping key. Exercises with the same (section_id, slide_group) render on a single slide in the SectionPage. NULL falls back to order_index.';
