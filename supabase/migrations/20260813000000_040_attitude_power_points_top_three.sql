-- Change the Attitude Power Points reflection exercise's prompt and
-- placeholder from "top two" attitudes to "top three" attitudes.

UPDATE public.exercises
SET content_json = jsonb_set(
  jsonb_set(
    content_json,
    '{prompt}',
    to_jsonb(E'Reflect on the following Attitude Power Points and write how your top three attitudes show up in your daily life, career choices, and relationships:\n\n1. An attitude is a way of valuing life — a world view, a paradigm of thought and action.\n2. Most of a person''s choices throughout life are guided by the hierarchy of their attitudes and needs satisfactions.\n3. Attitudes determine our purpose and direction in life, stimulating us to action.\n4. Attitudes are relatively constant throughout life and will usually change only in relation to a Significant Emotional Event.\n5. Behaviour (D.I.S.C.) is the methodology for fulfilling the passions driven by our attitudes.\n6. Attitudes tend to interact with one another.\n\nHow do your top three attitude types interact? Do they support or conflict with each other?'::text),
    true
  ),
  '{placeholder}',
  to_jsonb('My top three attitudes are ___, ___, and ___. I notice them showing up in my life when...'::text),
  true
)
WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'attitude')
  AND slug = 'attitude-power-points';
