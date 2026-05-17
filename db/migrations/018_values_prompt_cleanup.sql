-- Update the Values Shopping Spree follow-on prompt to a shorter, clearer version.

UPDATE public.exercises
SET content_json = jsonb_set(
  content_json,
  '{prompt}',
  to_jsonb('After completing the Values Shopping Spree, add each pair of items to total the score for that value. Then rank the 17 values from highest to lowest total spending. Your top 3 are your core values.'::text),
  true
)
WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'values')
  AND slug = 'what-do-i-value';