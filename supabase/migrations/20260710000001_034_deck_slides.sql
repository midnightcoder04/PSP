-- Migration 034: presentation deck
--
-- The facilitator presentation mode renders a standalone slide deck (rebuilt
-- from Course.pptx) — separate from the participant course content in
-- sections/exercises. Slides that correspond to course exercises carry
-- linked_exercise_slugs so the presenter can overlay live session responses.
--
--   1. deck_slides            — the shared deck (read: authorized presenters;
--                               write: admin only, text-level editor)
--   2. session_deck_overrides — per-session cover customization by the
--                               owning facilitator (never touches the deck)

-- ── 1. deck_slides ────────────────────────────────────────────────────────────

CREATE TABLE public.deck_slides (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  kind          text NOT NULL CHECK (kind IN (
                  'cover', 'section-title', 'quote', 'statement', 'bullets',
                  'two-col', 'disc-profile', 'numbered-list', 'image', 'contact')),
  chapter       text NOT NULL,
  order_index   integer NOT NULL UNIQUE,
  content_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  linked_exercise_slugs text[] NOT NULL DEFAULT '{}',
  notes         text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX deck_slides_order_idx ON public.deck_slides (order_index);

ALTER TABLE public.deck_slides ENABLE ROW LEVEL SECURITY;

-- Read: admins and flagged facilitators (has_presenter_access from 033).
CREATE POLICY deck_slides_select_presenter ON public.deck_slides
  FOR SELECT TO authenticated
  USING (public.has_presenter_access(auth.uid()));

-- Write: admin only (the text-level deck editor).
CREATE POLICY deck_slides_write_admin ON public.deck_slides
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS deck_slides_set_updated_at ON public.deck_slides;
CREATE TRIGGER deck_slides_set_updated_at
  BEFORE UPDATE ON public.deck_slides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 2. session_deck_overrides ─────────────────────────────────────────────────
-- One optional row per session; cover_json fields overlay the deck's cover
-- slide content ({title_line, subtitle, date_line, facilitator_name}).

CREATE TABLE public.session_deck_overrides (
  session_id  uuid PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  cover_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_deck_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY sdo_admin ON public.session_deck_overrides
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY sdo_facilitator ON public.session_deck_overrides
  FOR ALL TO authenticated
  USING (public.facilitates_session(auth.uid(), session_id))
  WITH CHECK (public.facilitates_session(auth.uid(), session_id));

DROP TRIGGER IF EXISTS session_deck_overrides_set_updated_at ON public.session_deck_overrides;
CREATE TRIGGER session_deck_overrides_set_updated_at
  BEFORE UPDATE ON public.session_deck_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
