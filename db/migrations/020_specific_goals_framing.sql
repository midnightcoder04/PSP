-- Migration 020: Add intro/closing framing to the specific-goals section.

UPDATE public.sections
SET framing = jsonb_build_object(
  'opening_quote', jsonb_build_object(
    'text', 'A goal without a plan is just a wish.',
    'attribution', '— Antoine de Saint-Exupéry'
  ),
  'opening_question', 'If you looked back on your life ten years from now and everything had gone well — what would need to be true?',
  'facilitator_says', 'Most people have wishes. Fewer have goals. The difference is specificity, a deadline, and honesty about difficulty. Right now we are going to take your most important aims — across every area of life, not just the obvious ones — and put them on paper.',
  'why_it_matters', 'People who write down specific goals achieve significantly more than those who don''t — not because writing is magic, but because it forces clarity. A vague aspiration like ''be more successful'' is not a goal; it''s a direction. This inventory asks you to be precise, to assess how important each goal really is, and to notice where your goals might conflict with each other.',
  'closing_reflection', 'Which goal — if you achieved nothing else this year — would make the biggest difference to your life?',
  'bridge_to_next', 'You have named your goals. Now we are going to pressure-test them against each other, because not all goals can be pursued at the same time.',
  'reading_material', jsonb_build_object(
    'title', 'Goals! — Brian Tracy',
    'content', 'Tracy''s central claim is that fewer than 3% of people have written, specific goals with deadlines — and that this single habit accounts for more of the variance in outcomes than talent, education, or circumstance. He draws on research from goal-setting psychology to show that clarity of intention is the primary differentiator between high and average performers. Read the first two chapters before the Life Goal Inventory; they will help you move from abstract wishes to concrete, dated targets.'
  )
)
WHERE slug = 'specific-goals';
