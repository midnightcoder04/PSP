-- Migration 003: sections + exercises tables (seeded course content)

CREATE TABLE IF NOT EXISTS public.sections (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text    NOT NULL UNIQUE,
  title       text    NOT NULL,
  subtitle    text,
  description text,
  order_index integer NOT NULL,
  icon_name   text
);

CREATE INDEX IF NOT EXISTS sections_order_idx ON public.sections (order_index);

CREATE TABLE IF NOT EXISTS public.exercises (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id   uuid    NOT NULL REFERENCES public.sections(id),
  slug         text    NOT NULL,
  title        text    NOT NULL,
  type         text    NOT NULL CHECK (type IN ('checkbox', 'text', 'table', 'ranking', 'info')),
  content_json jsonb   NOT NULL,
  order_index  integer NOT NULL,
  is_scored    boolean NOT NULL DEFAULT false,
  attribution  text,
  UNIQUE (section_id, slug)
);

CREATE INDEX IF NOT EXISTS exercises_section_idx ON public.exercises (section_id);
CREATE INDEX IF NOT EXISTS exercises_order_idx   ON public.exercises (section_id, order_index);

ALTER TABLE public.sections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
