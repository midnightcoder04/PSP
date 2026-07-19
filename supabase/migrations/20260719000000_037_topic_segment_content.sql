-- Migration 037: deck-insert content for the 14 non-Leadership training topics
--
-- Migration 036 seeded 15 training_topics but authored demo topic_segments
-- ("deck inserts") only for Leadership Development, so every other topic
-- showed the plain base deck. This migration adds 4 authored inserts per
-- remaining topic (discussion/example/suggestion, spanning several course
-- chapters), using the same idempotent INSERT ... WHERE NOT EXISTS pattern
-- as migration 036. Leadership Development's existing 2 rows are untouched.
--
-- IP compliance: as with migration 036, all content below is generic
-- corporate soft-skills material authored for this platform. It is NOT part
-- of the Personal Strategic Planning™ workbook (Sam Koshy / Compass Career
-- Life Solutions) or the D.I.S.C. material (Target Training International);
-- no PSP™ IP is copied here.

-- ── manager-development ────────────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: managing people who are not like you',
         'questions', jsonb_build_array(
           'Which style do you naturally manage well, and which do you find hardest?',
           'What does a High D report need from you that a High S report doesn''t?',
           'How should your delegation style change based on who you''re delegating to?')),
       10
FROM public.training_topics t
WHERE t.slug = 'manager-development'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'attitudes', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: modeling attitude as a manager',
         'questions', jsonb_build_array(
           'What attitude have you unintentionally passed on to your team?',
           'How quickly does your mood become the team''s mood?')),
       10
FROM public.training_topics t
WHERE t.slug = 'manager-development'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'attitudes' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'roles', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: rewrite the role, not just the title',
         'body', 'When someone moves into a management role, sit down together and rewrite what the role actually demands day to day — decisions to make, people to coordinate, outcomes to own. A promotion changes the demands of the role long before it changes the habits of the person in it.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'manager-development'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'roles' AND s.kind = 'suggestion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'goals', 'example',
       jsonb_build_object(
         'title', 'Example: cascading a team goal',
         'body', 'A manager sets a quarterly goal to cut customer response time by 20%. Instead of announcing it, she asks each direct report to identify one change in their own workflow that would move the number. The team goal becomes four personal goals, each owned rather than assigned.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'manager-development'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'goals' AND s.kind = 'example');

-- ── first-time-manager ─────────────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: leading former peers',
         'questions', jsonb_build_array(
           'How does your natural style change when the person across from you used to be your equal?',
           'What''s one thing about your style that will help you here, and one that might get in the way?')),
       10
FROM public.training_topics t
WHERE t.slug = 'first-time-manager'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'attitudes', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: name the self-doubt out loud',
         'body', 'Most first-time managers privately doubt they deserve the role. Naming that thought to a mentor or peer group — instead of just managing around it — usually shrinks it faster than trying to act confident until it feels real.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'first-time-manager'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'attitudes' AND s.kind = 'suggestion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'roles', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: the demands nobody warned you about',
         'questions', jsonb_build_array(
           'What does this role require of you that your old role never did?',
           'Which of your existing roles (parent, team member, mentor) prepared you for this one?')),
       10
FROM public.training_topics t
WHERE t.slug = 'first-time-manager'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'roles' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'skills', 'example',
       jsonb_build_object(
         'title', 'Example: a 90-day skill-building plan',
         'body', 'A new manager lists the three skills the role demands most (giving feedback, running a meeting, planning a week for others) and picks one transferable skill from their own inventory to build each around, rather than trying to become a different person in 90 days.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'first-time-manager'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'skills' AND s.kind = 'example');

-- ── conflict-management ────────────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: how each style fights',
         'questions', jsonb_build_array(
           'How does a High D typically handle disagreement compared to a High S?',
           'Which style are you most likely to clash with, and why?',
           'What does "productive conflict" look like for your own style?')),
       10
FROM public.training_topics t
WHERE t.slug = 'conflict-management'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'attitudes', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: attitude before the conversation',
         'questions', jsonb_build_array(
           'How does the attitude you walk in with change how the other person responds?',
           'What''s the difference between reframing an attitude and suppressing it?')),
       10
FROM public.training_topics t
WHERE t.slug = 'conflict-management'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'attitudes' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'values', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: find the value underneath the position',
         'body', 'Most recurring conflicts are two people defending different values (say, autonomy vs. consistency), not two people with a factual disagreement. Before arguing the position, ask what value the other person is actually protecting — it usually reframes the whole conversation.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'conflict-management'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'values' AND s.kind = 'suggestion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'closing', 'example',
       jsonb_build_object(
         'title', 'Example: a disagreement that ended better',
         'body', 'Two colleagues disagreed for months about a process change. Once each named the value they were protecting — one wanted speed, the other wanted quality control — they redesigned the process to protect both, instead of one side simply winning.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'conflict-management'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'closing' AND s.kind = 'example');

-- ── problem-solving ────────────────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: how your style shapes your first move',
         'questions', jsonb_build_array(
           'When a problem lands on your desk, is your first instinct to act, to ask, or to analyze?',
           'Which style on your team catches things you miss when solving problems?')),
       10
FROM public.training_topics t
WHERE t.slug = 'problem-solving'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'values', 'example',
       jsonb_build_object(
         'title', 'Example: two "right" answers',
         'body', 'A team choosing between a fast fix and a durable fix wasn''t actually disagreeing about facts — one group valued speed, the other valued long-term reliability. Naming that up front turned a stalled debate into a clear tradeoff decision.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'problem-solving'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'values' AND s.kind = 'example');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'skills', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: borrow a skill from another part of your life',
         'body', 'Look at your transferable skills inventory before reaching for a generic problem-solving framework. The skill that gets you through a tricky negotiation at home is often the same one that unblocks a stuck project at work.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'problem-solving'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'skills' AND s.kind = 'suggestion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'goals', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: solving for the goal, not the symptom',
         'questions', jsonb_build_array(
           'Is the problem in front of you the real obstacle, or a symptom of a goal that was never clearly set?',
           'What would change about how you solve this if you started from the goal instead of the complaint?')),
       10
FROM public.training_topics t
WHERE t.slug = 'problem-solving'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'goals' AND s.kind = 'discussion');

-- ── team-building ──────────────────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: building a team of complements, not copies',
         'questions', jsonb_build_array(
           'Which DISC styles are missing from your current team?',
           'What does a team of four High D''s get wrong that a mixed team wouldn''t?')),
       10
FROM public.training_topics t
WHERE t.slug = 'team-building'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'attitudes', 'example',
       jsonb_build_object(
         'title', 'Example: one attitude, whole team',
         'body', 'A single team member''s cynicism about a new initiative spread to three others within a week, before the project even started. Attitude moves through a team faster than information does.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'team-building'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'attitudes' AND s.kind = 'example');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'values', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: shared values vs. shared opinions',
         'questions', jsonb_build_array(
           'Where does this team already share values, even when it disagrees on approach?',
           'What value would you want this team to be known for a year from now?')),
       10
FROM public.training_topics t
WHERE t.slug = 'team-building'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'values' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'roles', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: write down who owns what',
         'body', 'A surprising number of team conflicts are really unclear role boundaries in disguise. Have the team write out, in one sentence each, what they believe their own role covers — then compare notes.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'team-building'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'roles' AND s.kind = 'suggestion');

-- ── team-bonding ───────────────────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: what you appreciate in a different style',
         'questions', jsonb_build_array(
           'Name a teammate whose style is very different from yours — what do you appreciate about how they work?',
           'What would you want a different-style teammate to know about how you like to be approached?')),
       10
FROM public.training_topics t
WHERE t.slug = 'team-bonding'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'attitudes', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: the mood we bring into the room',
         'questions', jsonb_build_array(
           'What attitude do you want to be known for bringing to this team?',
           'When has someone else''s attitude changed your day for the better?')),
       10
FROM public.training_topics t
WHERE t.slug = 'team-bonding'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'attitudes' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'values', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: a two-minute values swap',
         'body', 'Pair up and each share one value from your list that surprised your partner. It''s a fast way to find common ground that has nothing to do with job titles or seniority.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'team-bonding'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'values' AND s.kind = 'suggestion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'closing', 'example',
       jsonb_build_object(
         'title', 'Example: a bonding retrospective',
         'body', 'At the end of a project, a team spent ten minutes naming one thing they''d learned about how a teammate works best. Months later, several said that exercise had done more for how they worked together than any team-building event had.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'team-bonding'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'closing' AND s.kind = 'example');

-- ── communication-skills ───────────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: adapting your message to the listener''s style',
         'questions', jsonb_build_array(
           'How would you shorten your message for a High D versus a High C?',
           'What''s the biggest communication mismatch you''ve had with someone of a different style?')),
       10
FROM public.training_topics t
WHERE t.slug = 'communication-skills'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'attitudes', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: separate the message from the mood',
         'body', 'Before sending a difficult message, ask whether you''re communicating the content or venting the attitude behind it. If it''s the latter, wait until the attitude has settled and send the content on its own.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'communication-skills'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'attitudes' AND s.kind = 'suggestion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'roles', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: what each role needs to hear',
         'questions', jsonb_build_array(
           'Does everyone in your different roles (manager, peer, parent) need the same style of communication from you?',
           'Which of your roles demands the most careful communication right now?')),
       10
FROM public.training_topics t
WHERE t.slug = 'communication-skills'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'roles' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'skills', 'example',
       jsonb_build_object(
         'title', 'Example: listening as a transferable skill',
         'body', 'Someone who lists "active listening" as a strongest transferable skill from volunteering discovers it''s the exact skill their manager role has been missing in one-on-ones — the skill transferred, it just needed to be named and pointed at a new context.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'communication-skills'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'skills' AND s.kind = 'example');

-- ── productivity-effectiveness ─────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: build habits around your style, not against it',
         'body', 'A High I forcing themselves into a rigid daily planner and a High C forcing themselves to "just wing it" are both fighting their own wiring. Design your productivity system around your natural style first, then adjust for what the work needs.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'productivity-effectiveness'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'suggestion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'attitudes', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: attitude and output',
         'questions', jsonb_build_array(
           'What attitude tends to precede your most productive days?',
           'Which attitude do you fall into when you''re avoiding something important?')),
       10
FROM public.training_topics t
WHERE t.slug = 'productivity-effectiveness'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'attitudes' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'skills', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: your most effective transferable skill',
         'questions', jsonb_build_array(
           'Which of your top transferable skills, if used more deliberately, would save you the most time?',
           'What task do you avoid that a favorite skill of yours could actually make easier?')),
       10
FROM public.training_topics t
WHERE t.slug = 'productivity-effectiveness'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'skills' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'goals', 'example',
       jsonb_build_object(
         'title', 'Example: one goal, not five',
         'body', 'Someone juggling five personal-effectiveness goals at once made no visible progress on any of them. Cutting the list to one clearly written goal, with a concrete first step, produced more change in a month than the previous year of good intentions.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'productivity-effectiveness'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'goals' AND s.kind = 'example');

-- ── critical-thinking ──────────────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: how style shapes analysis',
         'questions', jsonb_build_array(
           'How does a High C''s approach to a decision differ from a High I''s?',
           'Which part of critical thinking comes easiest to your style, and which takes deliberate effort?')),
       10
FROM public.training_topics t
WHERE t.slug = 'critical-thinking'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'values', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: separate the value from the fact',
         'body', 'When a decision feels stuck, write down separately what you know to be true and what you simply prefer. Most "irrational" disagreements are values wearing the costume of facts.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'critical-thinking'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'values' AND s.kind = 'suggestion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'skills', 'example',
       jsonb_build_object(
         'title', 'Example: a skill applied outside its usual home',
         'body', 'Someone who lists "pattern recognition" as a top transferable skill from years of customer support used the exact same skill to spot a flaw in a financial model no one else on the team caught.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'critical-thinking'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'skills' AND s.kind = 'example');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'goals', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: thinking critically about your own goals',
         'questions', jsonb_build_array(
           'Which of your current goals would you set differently if you re-examined it today?',
           'What assumption is a current goal of yours resting on that you''ve never actually tested?')),
       10
FROM public.training_topics t
WHERE t.slug = 'critical-thinking'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'goals' AND s.kind = 'discussion');

-- ── customer-service ───────────────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: reading a customer''s style quickly',
         'questions', jsonb_build_array(
           'What signals tell you within the first minute whether a customer is task-oriented or people-oriented?',
           'How do you adjust your pace for an impatient High D customer versus a cautious High C customer?')),
       10
FROM public.training_topics t
WHERE t.slug = 'customer-service'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'attitudes', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: reset your attitude between calls',
         'body', 'A difficult interaction leaves a residue that the next customer will feel if you don''t clear it. Build a short, deliberate reset (a breath, a note, a walk to the kettle) into the gap between calls rather than carrying one conversation''s attitude into the next.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'customer-service'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'attitudes' AND s.kind = 'suggestion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'values', 'example',
       jsonb_build_object(
         'title', 'Example: service recovery rooted in values',
         'body', 'A support agent who values fairness over speed took longer to resolve a billing dispute but resolved it in a way the customer described as "the first time a company actually looked at my situation." The extra time paid for itself in the review it earned.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'customer-service'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'values' AND s.kind = 'example');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'skills', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: the skill behind great service',
         'questions', jsonb_build_array(
           'Which of your transferable skills shows up most when a customer interaction goes well?',
           'What skill from outside work has quietly made you better at this job?')),
       10
FROM public.training_topics t
WHERE t.slug = 'customer-service'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'skills' AND s.kind = 'discussion');

-- ── change-management ──────────────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: how each style reacts to change',
         'questions', jsonb_build_array(
           'Which style on your team welcomes change fastest, and which resists it longest?',
           'What does "resistance to change" look like for your own style specifically?')),
       10
FROM public.training_topics t
WHERE t.slug = 'change-management'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'attitudes', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: reframing resistance',
         'questions', jsonb_build_array(
           'What is the resistance to this change actually protecting?',
           'How is a "wait and see" attitude different from a "no" attitude, and how should you respond to each?')),
       10
FROM public.training_topics t
WHERE t.slug = 'change-management'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'attitudes' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'goals', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: set the first goal small and visible',
         'body', 'During a major change, the first goal you set for a team should be small enough to hit within a couple of weeks and visible enough that everyone notices it happened. Momentum, not the size of the win, is what carries people through the rest of the change.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'change-management'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'goals' AND s.kind = 'suggestion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'closing', 'example',
       jsonb_build_object(
         'title', 'Example: a change that stuck',
         'body', 'A reorg that had failed twice before finally stuck the third time, not because the plan changed, but because the team was given a genuine say in the sequencing — the destination stayed the same, but ownership of the path changed everything.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'change-management'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'closing' AND s.kind = 'example');

-- ── stress-management ──────────────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: what stresses your style specifically',
         'questions', jsonb_build_array(
           'What situation reliably puts your particular style under stress?',
           'How does your behavior change, for better or worse, when you''re under pressure?')),
       10
FROM public.training_topics t
WHERE t.slug = 'stress-management'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'attitudes', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: reframe before you react',
         'body', 'The gap between a stressful event and your reaction is where the attitude gets chosen, even if it doesn''t feel that way in the moment. Building a five-second pause before responding is often the single highest-leverage stress-management habit available.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'stress-management'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'attitudes' AND s.kind = 'suggestion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'values', 'example',
       jsonb_build_object(
         'title', 'Example: relief that matches your values',
         'body', 'Someone who values order and control found that a to-do-list reset relieved their stress far more than the meditation app everyone recommended — the relief that works is the one aligned with what you actually value, not the one that''s popular.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'stress-management'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'values' AND s.kind = 'example');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'roles', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: which role is overloaded right now',
         'questions', jsonb_build_array(
           'Of all the roles you play, which one is currently demanding more than it''s giving back?',
           'What would it look like to lower the demands of one role this month, even slightly?')),
       10
FROM public.training_topics t
WHERE t.slug = 'stress-management'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'roles' AND s.kind = 'discussion');

-- ── sales-training ─────────────────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: pitching to a style, not a script',
         'questions', jsonb_build_array(
           'How would you shorten your pitch for a High D prospect who wants the bottom line first?',
           'What does a High S prospect need to hear before they''ll trust a recommendation?')),
       10
FROM public.training_topics t
WHERE t.slug = 'sales-training'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'attitudes', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: separate the rejection from the attitude',
         'body', 'A "no" is information about the deal, not a verdict on you. Build a short ritual after every rejection — write down the actual reason given, then set the attitude down before the next call — instead of letting it compound across the day.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'sales-training'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'attitudes' AND s.kind = 'suggestion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'skills', 'example',
       jsonb_build_object(
         'title', 'Example: a transferable skill closes the deal',
         'body', 'A former teacher moving into sales found that "breaking down a complex idea into simple steps" — the exact skill from the classroom — was what finally got a hesitant technical buyer to say yes, more than any objection-handling script.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'sales-training'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'skills' AND s.kind = 'example');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'goals', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: a sales goal that fits your values',
         'questions', jsonb_build_array(
           'Does your current sales target feel like it fits how you want to work, or does it fight against it?',
           'What would a sales goal look like that you''d actually be proud of hitting, not just relieved to hit?')),
       10
FROM public.training_topics t
WHERE t.slug = 'sales-training'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'goals' AND s.kind = 'discussion');

-- ── career-development ─────────────────────────────────────────────────────

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: choosing roles that fit your style',
         'questions', jsonb_build_array(
           'Which part of your current role fits your natural style, and which part fights it?',
           'What kind of work environment brings out your best, based on your style?')),
       10
FROM public.training_topics t
WHERE t.slug = 'career-development'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'values', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: career choices and core values',
         'questions', jsonb_build_array(
           'Which of your top values is best served by your current career path, and which is being neglected?',
           'If you had to choose your next role based on values alone, what would you look for?')),
       10
FROM public.training_topics t
WHERE t.slug = 'career-development'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'values' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'roles', 'suggestion',
       jsonb_build_object(
         'title', 'Suggestion: audit your roles before your next move',
         'body', 'Before chasing the next title, list the roles you currently play and what each actually demands of you. A career move that changes the title but keeps the same demands rarely delivers the change you were hoping for.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'career-development'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'roles' AND s.kind = 'suggestion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'goals', 'example',
       jsonb_build_object(
         'title', 'Example: a career goal built from the inventory, not the job title',
         'body', 'Instead of setting a goal like "become a director," someone set a goal to spend 30% of their week on the two transferable skills they''d enjoyed most across every past job. The director title followed within two years, as a byproduct rather than the target.')
       , 10
FROM public.training_topics t
WHERE t.slug = 'career-development'
  AND NOT EXISTS (SELECT 1 FROM public.topic_segments s WHERE s.topic_id = t.id AND s.chapter = 'goals' AND s.kind = 'example');
