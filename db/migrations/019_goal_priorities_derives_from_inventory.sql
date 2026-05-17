-- Migration 019: Goal Priorities derives from Life Goal Inventory rows.
-- Items are now dynamically populated from the participant's filled goals;
-- the static priority_1…priority_10 placeholder items are removed.

UPDATE public.exercises
SET content_json = jsonb_build_object(
  'prompt', 'Your goals from the Life Goal Inventory appear below. Drag them to rank by importance — most important at the top. Your top 10 are recorded.',
  'interaction', 'drag',
  'derives_from', jsonb_build_object(
    'source_exercise_slug', 'life-goal-inventory',
    'group_by', 'goal_inventory_rows'
  ),
  'items', '[]'::jsonb
)
WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'specific-goals')
  AND slug = 'goal-priorities';
