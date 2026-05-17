-- Migration 007: per-section facilitator framing (Iteration 2)
--
-- Adds a nullable `framing` JSONB column to public.sections. The schema is
-- documented in specs/001-psp-course-platform/data-model.md ("framing JSONB
-- schema") and validated at seed time, not at SQL time, to keep authoring
-- friction low.
--
-- Source of truth: specs/001-psp-course-platform/framing-content.md.
-- Populated by scripts/seed.ts via db/seeds/course-content.json.

ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS framing jsonb;
