-- Migration 022: make testimonials.session_id nullable.
--
-- Sessions are not wired up for self-directed participants (SectionPage has
-- sessionId = null throughout this iteration). Without an enrollment the
-- TestimonialModal was hard-blocked ("No active session"). Allow session_id
-- to be NULL so participants without an enrollment can still leave a
-- testimonial; when a session IS present it is stored as before.
--
-- The old composite UNIQUE (participant_id, session_id) is dropped and
-- replaced with two partial unique indexes:
--   • one per participant+session (WHERE session_id IS NOT NULL)
--   • one standalone per participant (WHERE session_id IS NULL)
-- This preserves the "one testimonial per participant per cohort" invariant
-- while allowing exactly one sessionless testimonial per participant.

ALTER TABLE public.testimonials
  ALTER COLUMN session_id DROP NOT NULL;

ALTER TABLE public.testimonials
  DROP CONSTRAINT testimonials_participant_id_session_id_key;

CREATE UNIQUE INDEX testimonials_participant_session_uniq
  ON public.testimonials (participant_id, session_id)
  WHERE session_id IS NOT NULL;

CREATE UNIQUE INDEX testimonials_participant_no_session_uniq
  ON public.testimonials (participant_id)
  WHERE session_id IS NULL;
