#!/usr/bin/env python3
"""
Generates db/migrations/014_content_restructure.sql from db/seeds/course-content.json.
One-shot dev tool — emits the canonical migration body. Re-running produces identical output.

The migration:
- Phase A: adds `group_slug` column to public.sections (+ CHECK constraint)
- Phase B: wipes public.responses + public.progress (pre-prod-safe per Assumption A-1)
- Phase C: deletes + re-inserts all sections + exercises from the seed JSON
- Phase D: runtime sanity assertions
- Wrapped in a single BEGIN/COMMIT transaction.

Idempotent via IF NOT EXISTS guards on schema additions and full delete-then-insert
on data; second apply produces zero diff.
"""

import json
import sys
from pathlib import Path

SEED_PATH = Path("db/seeds/course-content.json")
MIGRATION_PATH = Path("db/migrations/014_content_restructure.sql")
SUPABASE_MIRROR_PATH = Path("supabase/migrations/20260516000000_014_content_restructure.sql")


def sql_quote(s):
    """Escape a string for SQL single-quoted literal."""
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def jsonb_literal(value):
    """Emit a JSON value as a `$$...$$::jsonb` Postgres literal (dollar-quoted)."""
    if value is None:
        return "NULL"
    return f"$json${json.dumps(value, ensure_ascii=False)}$json$::jsonb"


def header():
    return """-- db/migrations/014_content_restructure.sql
--
-- Migration 014: course content restructure into 3 groups / 9 sections /
-- per-question answer fields (specs/004-content-restructure).
--
-- See specs/004-content-restructure/contracts/migration-014.md for the contract
-- this migration implements and specs/004-content-restructure/contracts/group-section-mapping.md
-- for the authoritative content mapping.
--
-- DESTRUCTIVE: wipes public.responses and public.progress. Pre-production-safe
-- per Assumption A-1 (user confirmation 2026-05-15).
--
-- Idempotent: re-running produces zero diff (schema guards + delete-then-insert).

BEGIN;

-- ── Phase A — Schema additions ───────────────────────────────────────────
ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS group_slug text;

DO $$ BEGIN
  ALTER TABLE public.sections
    ADD CONSTRAINT sections_group_slug_check
    CHECK (group_slug IS NULL
        OR group_slug IN ('self-awareness','goal-setting','strategic-planning'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.sections.group_slug IS
  '3-value enum: self-awareness | goal-setting | strategic-planning. Drives the group bands on /course.';

-- ── Phase B — Wipe participant rows ──────────────────────────────────────
DELETE FROM public.responses;
DELETE FROM public.progress;

-- ── Phase C — Reseed sections + exercises ────────────────────────────────
DELETE FROM public.exercises;
DELETE FROM public.sections;

"""


def section_inserts(sections):
    lines = ["INSERT INTO public.sections (slug, title, subtitle, description, order_index, group_slug, icon_name, framing) VALUES"]
    rows = []
    for s in sections:
        rows.append(
            "  ("
            + sql_quote(s["slug"]) + ", "
            + sql_quote(s["title"]) + ", "
            + sql_quote(s.get("subtitle")) + ", "
            + sql_quote(s.get("description")) + ", "
            + str(s["order_index"]) + ", "
            + sql_quote(s.get("group_slug")) + ", "
            + sql_quote(s.get("icon_name")) + ", "
            + jsonb_literal(s.get("framing"))
            + ")"
        )
    lines.append(",\n".join(rows) + ";\n")
    return "\n".join(lines)


def exercise_inserts(sections):
    """Emit one INSERT per section's exercise list — keeps each statement small enough
    to apply via Supabase MCP without overflowing tool-call size limits."""
    out = ["", "-- Exercises — one INSERT per section to keep chunks small."]
    for section in sections:
        if not section["exercises"]:
            continue
        out.append("")
        out.append(f"-- {section['slug']}")
        out.append(f"WITH s AS (SELECT id, slug FROM public.sections WHERE slug={sql_quote(section['slug'])})")
        out.append("INSERT INTO public.exercises (section_id, slug, title, type, content_json, order_index, is_scored, attribution) VALUES")
        rows = []
        for e in section["exercises"]:
            rows.append(
                "  (\n    (SELECT id FROM s),\n    "
                + sql_quote(e["slug"]) + ",\n    "
                + sql_quote(e["title"]) + ",\n    "
                + sql_quote(e["type"]) + ",\n    "
                + jsonb_literal(e.get("content_json")) + ",\n    "
                + str(e["order_index"]) + ",\n    "
                + ("true" if e.get("is_scored") else "false") + ",\n    "
                + sql_quote(e.get("attribution"))
                + "\n  )"
            )
        out.append(",\n".join(rows) + ";")
    return "\n".join(out)


def footer():
    return """
-- ── Phase D — Sanity (assertions inside the migration) ──────────────────
DO $$
DECLARE
  v_section_count int;
  v_group_count int;
  v_response_count int;
  v_progress_count int;
BEGIN
  SELECT COUNT(*) INTO v_section_count FROM public.sections;
  SELECT COUNT(DISTINCT group_slug) INTO v_group_count FROM public.sections;
  SELECT COUNT(*) INTO v_response_count FROM public.responses;
  SELECT COUNT(*) INTO v_progress_count FROM public.progress;

  IF v_section_count <> 9 THEN
    RAISE EXCEPTION 'expected 9 sections, got %', v_section_count;
  END IF;
  IF v_group_count <> 3 THEN
    RAISE EXCEPTION 'expected 3 distinct group_slug values, got %', v_group_count;
  END IF;
  IF v_response_count <> 0 THEN
    RAISE EXCEPTION 'expected responses to be wiped, found % rows', v_response_count;
  END IF;
  IF v_progress_count <> 0 THEN
    RAISE EXCEPTION 'expected progress to be wiped, found % rows', v_progress_count;
  END IF;
END $$;

COMMIT;
"""


def main():
    seed = json.loads(SEED_PATH.read_text())
    body = (
        header()
        + section_inserts(seed["sections"])
        + exercise_inserts(seed["sections"])
        + footer()
    )
    MIGRATION_PATH.write_text(body)
    SUPABASE_MIRROR_PATH.write_text(body)
    line_count = body.count("\n")
    print(f"wrote {MIGRATION_PATH} ({line_count} lines)")
    print(f"wrote {SUPABASE_MIRROR_PATH} ({line_count} lines)")


if __name__ == "__main__":
    main()
