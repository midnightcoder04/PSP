-- Migration 036: topic-aware facilitator presentation (iteration 007)
--
-- Makes the presenter deck topic-aware. A session is tagged with one or more
-- training topics and a session_type; the presenter deck then interleaves
-- topic-specific inserts (discussion questions / examples / suggestions) at
-- course-chapter boundaries, and — for team-based sessions only — a
-- team-collaboration slide (rendered client-side from existing live responses).
--
--   1. sessions.session_type  — team-based | individual | private-group
--   2. training_topics         — admin-managed catalog (read: presenters)
--   3. session_topics          — M:N session ↔ topics (write: owning facilitator)
--   4. topic_segments          — authored inserts per (topic, chapter, kind)
--
-- IP compliance: the seeded topics and demo discussion prompts below are
-- generic corporate soft-skills content authored for this platform. They are
-- NOT part of the Personal Strategic Planning™ workbook (Sam Koshy /
-- Compass Career Life Solutions) or the D.I.S.C. material (Target Training
-- International); no PSP™ IP is copied here.

-- ── 1. sessions.session_type ──────────────────────────────────────────────────
-- Default 'individual' so per-participant profiles are never surfaced on the
-- team-collaboration slide unless a facilitator explicitly opts the session in.

ALTER TABLE public.sessions
  ADD COLUMN session_type text NOT NULL DEFAULT 'individual'
    CHECK (session_type IN ('team-based', 'individual', 'private-group'));

-- ── 2. training_topics ────────────────────────────────────────────────────────

CREATE TABLE public.training_topics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX training_topics_order_idx ON public.training_topics (order_index);

ALTER TABLE public.training_topics ENABLE ROW LEVEL SECURITY;

-- Read: admins and flagged facilitators (has_presenter_access from 033), so the
-- presenter and the session-tagging UI can load the catalog.
CREATE POLICY training_topics_select_presenter ON public.training_topics
  FOR SELECT TO authenticated
  USING (public.has_presenter_access(auth.uid()));

-- Write: admin only (the topic authoring screen), mirroring deck_slides.
CREATE POLICY training_topics_write_admin ON public.training_topics
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS training_topics_set_updated_at ON public.training_topics;
CREATE TRIGGER training_topics_set_updated_at
  BEFORE UPDATE ON public.training_topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. session_topics (M:N) ───────────────────────────────────────────────────

CREATE TABLE public.session_topics (
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  topic_id   uuid NOT NULL REFERENCES public.training_topics(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, topic_id)
);

CREATE INDEX session_topics_topic_idx ON public.session_topics (topic_id);

ALTER TABLE public.session_topics ENABLE ROW LEVEL SECURITY;

-- Admins, or the facilitator who owns the session, may tag it.
CREATE POLICY session_topics_admin ON public.session_topics
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY session_topics_facilitator ON public.session_topics
  FOR ALL TO authenticated
  USING (public.facilitates_session(auth.uid(), session_id))
  WITH CHECK (public.facilitates_session(auth.uid(), session_id));

-- ── 4. topic_segments (authored inserts) ──────────────────────────────────────
-- One row per authored insert. `chapter` reuses the deck chapter vocabulary
-- (opening/personality/attitudes/values/roles/skills/goals/closing) and places
-- the insert after that chapter's last deck slide. content_json shape by kind:
--   discussion → { title, questions: text[] }
--   example    → { title, body }
--   suggestion → { title, body }

CREATE TABLE public.topic_segments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id     uuid NOT NULL REFERENCES public.training_topics(id) ON DELETE CASCADE,
  chapter      text NOT NULL CHECK (chapter IN (
                 'opening', 'personality', 'attitudes', 'values',
                 'roles', 'skills', 'goals', 'closing')),
  kind         text NOT NULL CHECK (kind IN ('discussion', 'example', 'suggestion')),
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_index  integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX topic_segments_topic_chapter_idx
  ON public.topic_segments (topic_id, chapter, order_index);

ALTER TABLE public.topic_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY topic_segments_select_presenter ON public.topic_segments
  FOR SELECT TO authenticated
  USING (public.has_presenter_access(auth.uid()));

CREATE POLICY topic_segments_write_admin ON public.topic_segments
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS topic_segments_set_updated_at ON public.topic_segments;
CREATE TRIGGER topic_segments_set_updated_at
  BEFORE UPDATE ON public.topic_segments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. Seed catalog ───────────────────────────────────────────────────────────
-- The corporate soft-skills topics from the brief. Idempotent by slug so a
-- re-run is safe; admins refine names/descriptions and author segments in-app.

INSERT INTO public.training_topics (slug, name, order_index) VALUES
  ('leadership-development',        'Leadership Development',             10),
  ('manager-development',           'Manager Development',                20),
  ('first-time-manager',            'First-Time Manager Programs',        30),
  ('conflict-management',           'Conflict Management',                40),
  ('problem-solving',               'Problem Solving',                    50),
  ('team-building',                 'Team Building',                      60),
  ('team-bonding',                  'Team Bonding',                       70),
  ('communication-skills',          'Communication Skills',              80),
  ('productivity-effectiveness',    'Productivity & Personal Effectiveness', 90),
  ('critical-thinking',             'Critical Thinking',                 100),
  ('customer-service',              'Customer Service & Client Management', 110),
  ('change-management',             'Change Management',                 120),
  ('stress-management',             'Stress Management',                 130),
  ('sales-training',                'Sales Training',                    140),
  ('career-development',            'Career Development',                150)
ON CONFLICT (slug) DO NOTHING;

-- Two demo discussion inserts for Leadership Development so the flow is
-- visible out of the box; admins add/edit/remove these in the Topics screen.
INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'personality', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: leading across styles',
         'questions', jsonb_build_array(
           'Why do people approach the same situation differently?',
           'How does each DISC style contribute to a team''s results?',
           'Which style is hardest for you to lead, and why?')),
       10
FROM public.training_topics t
WHERE t.slug = 'leadership-development'
  AND NOT EXISTS (
    SELECT 1 FROM public.topic_segments s
    WHERE s.topic_id = t.id AND s.chapter = 'personality' AND s.kind = 'discussion');

INSERT INTO public.topic_segments (topic_id, chapter, kind, content_json, order_index)
SELECT t.id, 'attitudes', 'discussion',
       jsonb_build_object(
         'title', 'Discuss: attitude and influence',
         'questions', jsonb_build_array(
           'What challenges arise on a team because of attitude differences?',
           'How can a leader reframe a negative attitude without dismissing it?')),
       10
FROM public.training_topics t
WHERE t.slug = 'leadership-development'
  AND NOT EXISTS (
    SELECT 1 FROM public.topic_segments s
    WHERE s.topic_id = t.id AND s.chapter = 'attitudes' AND s.kind = 'discussion');
