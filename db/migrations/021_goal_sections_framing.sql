-- Migration 021: Add intro/closing framing to the three goal-setting sections
-- that previously had framing: null.

-- goal-impact-matrix
UPDATE public.sections
SET framing = jsonb_build_object(
  'opening_quote', jsonb_build_object(
    'text', 'The essence of strategy is choosing what not to do.',
    'attribution', '— Michael Porter'
  ),
  'opening_question', 'If you could only work on one goal for the next six months, which one would move the most other goals forward?',
  'facilitator_says', 'Not all goals are created equal — and some actively get in each other''s way. This matrix is where strategy gets real: you are going to map exactly which of your goals support each other and which ones create friction.',
  'why_it_matters', 'Most goal-setting fails because people pursue everything at once. The Cross-Impact Matrix forces you to see your goals as a system — which ones are multipliers, which create drag, and where the real conflicts lie. Once you can see that map, your priorities stop being guesses.',
  'closing_reflection', 'Which two goals, if achieved together, would create the most momentum across the rest of your list?',
  'bridge_to_next', 'You have mapped the logic of your goals. Now we move from analysis to imagination — seeing yourself already there.',
  'reading_material', jsonb_build_object(
    'title', 'Essentialism: The Disciplined Pursuit of Less — Greg McKeown',
    'content', 'McKeown''s argument is that most people spread effort across too many things and achieve mediocrity everywhere, when disciplined focus on fewer things produces exceptional results. The Cross-Impact Matrix is the analytical version of his central question: ''What is the one thing that, by doing it, makes everything else easier or unnecessary?'' Read Chapter 8 on Trade-offs — it directly maps onto what you are about to do.'
  )
)
WHERE slug = 'goal-impact-matrix';

-- visualization
UPDATE public.sections
SET framing = jsonb_build_object(
  'opening_quote', jsonb_build_object(
    'text', 'Imagination is everything. It is the preview of life''s coming attractions.',
    'attribution', '— Albert Einstein'
  ),
  'opening_question', 'Can you close your eyes and see yourself — in vivid, sensory detail — already living your most important goal?',
  'facilitator_says', 'Strategy is not just analysis. The brain cannot fully distinguish between a vividly imagined experience and a real one — which means your imagination is a training ground. We are going to use it.',
  'why_it_matters', 'Olympic athletes have used mental rehearsal for decades. Neuroscience confirms why: visualising an action activates the same neural pathways as performing it. When you picture yourself succeeding — specifically, emotionally, sensorially — you are reprogramming your baseline expectation of what is possible. That shift in expectation changes behaviour.',
  'closing_reflection', 'What did you see clearly — and what was still fuzzy or hard to hold? What does that tell you?',
  'bridge_to_next', 'You have seen the destination. Now we identify what stands between here and there — and build the plan to clear it.',
  'reading_material', jsonb_build_object(
    'title', 'Psycho-Cybernetics — Maxwell Maltz',
    'content', 'Maltz, a plastic surgeon who noticed that some patients'' self-image did not change after surgery, developed a model of the mind as a goal-seeking servo-mechanism. His central insight: the subconscious cannot distinguish between a real and a vividly imagined experience. His visualisation exercises predate the sports psychology literature by decades and remain among the most practical available. Read Part One before the journal exercise.'
  )
)
WHERE slug = 'visualization';

-- removing-obstacles-achieving-goals (final section — no bridge_to_next)
UPDATE public.sections
SET framing = jsonb_build_object(
  'opening_quote', jsonb_build_object(
    'text', 'It is not the mountain we conquer, but ourselves.',
    'attribution', '— Sir Edmund Hillary'
  ),
  'opening_question', 'What is the one obstacle — inside you, not outside you — that most reliably stops you from following through?',
  'facilitator_says', 'This is where the work lands. Everything you have done — understanding your style, examining your attitudes, naming your values, mapping your roles, listing your skills, setting your goals — all of it comes to nothing without action. This section is about closing the gap.',
  'why_it_matters', 'Goal failure almost always traces to the same causes: vague plans, unexamined obstacles, and unchallenged alibis. This section attacks all three. You will plan specifically, anticipate honestly, and — in the Declaration of Self-Esteem — remind yourself of who you are before the obstacles tried to convince you otherwise.',
  'closing_reflection', 'What one action will you take in the next 48 hours that moves you toward your most important goal?',
  'bridge_to_next', null,
  'reading_material', jsonb_build_object(
    'title', 'The War of Art — Steven Pressfield',
    'content', 'Pressfield names the force that stops meaningful work ''Resistance'' — and argues it is always proportional to the importance of the work. The more meaningful the goal, the stronger the Resistance. His book is a short, direct account of what it takes to act anyway. Read it alongside the Removing Obstacles exercise; Pressfield''s inventory of Resistance tactics maps almost exactly onto the alibi list you are about to complete.'
  )
)
WHERE slug = 'removing-obstacles-achieving-goals';
