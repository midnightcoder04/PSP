# Contract: Migration 014 — Content Restructure

**Feature**: 004-content-restructure
**Files**: `db/migrations/014_content_restructure.sql` + mirror `supabase/migrations/20260516000000_014_content_restructure.sql`
**Tests**: `db/tests/014_section_group_invariants.sql`, `db/tests/014_idempotency.sql`
**Down migration**: `db/migrations/014_content_restructure_down.sql` (best-effort restore of legacy seed; not row-data reversal — wipe is permanent)

This contract is the **authoritative shape** of migration 014. The .sql file is generated from this contract during WS-1.

---

## Pre-conditions

- Migrations 001–013 applied.
- `public.sections` exists with current 6-row content (from migration 003 + seed).
- `public.exercises` exists with current ~30-row content.
- `public.responses` and `public.progress` may contain N≥0 rows; **all will be deleted**.

## Post-conditions

- `public.sections.group_slug` column exists, NOT NULL on all 9 rows, ∈ `{ self-awareness, goal-setting, strategic-planning }`.
- `public.sections` contains **exactly 9 rows** with the new slugs (per `contracts/group-section-mapping.md`).
- `public.exercises` contains the new exercise inventory (~36 rows; exact count fixed by seed audit).
- `public.responses` count = 0.
- `public.progress` count = 0.
- `public.profiles`, `public.sessions`, `public.enrollments`, `public.testimonials` row counts: unchanged.
- The migration is idempotent: applying it a second time produces zero diff.

---

## DDL outline

```sql
-- db/migrations/014_content_restructure.sql
--
-- Migration 014: course content restructure into 3 groups / 9 sections / per-question answers.
--
-- See specs/004-content-restructure/contracts/migration-014.md for the contract this
-- migration implements. See specs/004-content-restructure/contracts/group-section-mapping.md
-- for the authoritative content mapping.
--
-- DESTRUCTIVE: wipes public.responses and public.progress. Pre-production-safe per
-- Assumption A-1 (confirmed by user 2026-05-15).

BEGIN;

-- ── Phase A — Schema additions ─────────────────────────────────────────────
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

-- ── Phase B — Wipe participant rows ────────────────────────────────────────
DELETE FROM public.responses;
DELETE FROM public.progress;

-- ── Phase C — Reseed sections + exercises ──────────────────────────────────
DELETE FROM public.exercises;
DELETE FROM public.sections;

INSERT INTO public.sections (slug, title, subtitle, description, order_index, group_slug, icon_name) VALUES
  ('personality',                       'Personality',                       NULL, NULL, 1, 'self-awareness',    NULL),
  ('attitude',                          'Attitude',                          NULL, NULL, 2, 'self-awareness',    NULL),
  ('values',                            'Values',                            NULL, NULL, 3, 'self-awareness',    NULL),
  ('roles-and-demands',                 'Roles and Demands',                 NULL, NULL, 4, 'self-awareness',    NULL),
  ('transferable-skills',               'Transferable Marketable Skills',    NULL, NULL, 5, 'self-awareness',    NULL),
  ('specific-goals',                    'Specific Goals',                    NULL, NULL, 6, 'goal-setting',      NULL),
  ('goal-impact-matrix',                'Goal Impact Matrix',                NULL, NULL, 7, 'goal-setting',      NULL),
  ('visualization',                     'Visualization',                     NULL, NULL, 8, 'goal-setting',      NULL),
  ('removing-obstacles-achieving-goals','Removing Obstacles, Achieving Goals', NULL, NULL, 9, 'strategic-planning', NULL);

-- Exercises: inserted from a CTE that joins on slug.
-- See contracts/group-section-mapping.md for the canonical exercise inventory.
WITH s AS (SELECT id, slug FROM public.sections)
INSERT INTO public.exercises (section_id, slug, title, type, content_json, order_index, is_scored, attribution)
VALUES
  -- personality (7 exercises) -- content_json bodies copied verbatim from prior seed
  ((SELECT id FROM s WHERE slug='personality'),       'disc-introduction',          'D.I.S.C. — Discovering My Personal Behavioural Design', 'info', $$ … $$::jsonb, 1, false, $$Bill Bonnstetter / Target Training International$$),
  -- … (continues; full row set generated from contracts/group-section-mapping.md by the WS-2 seed regenerator)

  -- removing-obstacles-achieving-goals (5 exercises)
  ((SELECT id FROM s WHERE slug='removing-obstacles-achieving-goals'), 'declaration-of-self-esteem', 'My Declaration of Self-Esteem', 'text', $$ … $$::jsonb, 5, false, NULL);

-- ── Phase D — Sanity (assertions inside the migration) ─────────────────────
DO $$
DECLARE
  v_section_count int;
  v_group_count int;
  v_response_count int;
BEGIN
  SELECT COUNT(*) INTO v_section_count FROM public.sections;
  SELECT COUNT(DISTINCT group_slug) INTO v_group_count FROM public.sections;
  SELECT COUNT(*) INTO v_response_count FROM public.responses;

  IF v_section_count <> 9 THEN RAISE EXCEPTION 'expected 9 sections, got %', v_section_count; END IF;
  IF v_group_count <> 3   THEN RAISE EXCEPTION 'expected 3 groups, got %',   v_group_count;   END IF;
  IF v_response_count <> 0 THEN RAISE EXCEPTION 'expected responses to be wiped, found % rows', v_response_count; END IF;
END $$;

COMMIT;
```

---

## Idempotency proof

Running 014 a second time:

- Phase A: `ADD COLUMN IF NOT EXISTS` no-ops; `ADD CONSTRAINT` is wrapped in `DO … EXCEPTION WHEN duplicate_object` so it no-ops.
- Phase B: `DELETE FROM responses/progress` on an empty table is a no-op.
- Phase C: `DELETE FROM exercises/sections` then re-`INSERT` produces identical rows (UUIDs regenerate but slugs+content stay identical; downstream code keys on slug).

Captured as `db/tests/014_idempotency.sql`:

```sql
BEGIN;
\i db/migrations/014_content_restructure.sql
\i db/migrations/014_content_restructure.sql
-- assert: SELECT COUNT(*) FROM sections = 9 AND COUNT(*) FROM exercises = (seed count) AND no errors raised
ROLLBACK;
```

---

## Test: `db/tests/014_section_group_invariants.sql`

```sql
-- RED proof (pre-014): expected to fail because group_slug column does not exist.
-- GREEN proof (post-014): asserts the 9-section / 3-group / monotone-order invariant.

DO $$
DECLARE
  r RECORD;
  prev_order int := 0;
  prev_group_order int := 0;
  group_order_map jsonb := '{"self-awareness":1,"goal-setting":2,"strategic-planning":3}';
BEGIN
  -- I1: counts
  IF (SELECT COUNT(*) FROM public.sections) <> 9 THEN
    RAISE EXCEPTION 'I1: expected 9 sections, got %', (SELECT COUNT(*) FROM public.sections);
  END IF;
  IF (SELECT COUNT(DISTINCT group_slug) FROM public.sections) <> 3 THEN
    RAISE EXCEPTION 'I1: expected 3 distinct groups';
  END IF;

  -- I2: monotone ordering of (group_order, order_index)
  FOR r IN SELECT slug, order_index, group_slug FROM public.sections ORDER BY order_index LOOP
    IF (group_order_map ->> r.group_slug)::int < prev_group_order THEN
      RAISE EXCEPTION 'I2: % at order_index=% in group % comes before earlier group',
        r.slug, r.order_index, r.group_slug;
    END IF;
    prev_group_order := (group_order_map ->> r.group_slug)::int;
    IF r.order_index <= prev_order THEN
      RAISE EXCEPTION 'I2: % has order_index=% but previous row had %',
        r.slug, r.order_index, prev_order;
    END IF;
    prev_order := r.order_index;
  END LOOP;
END $$;
```

---

## Down migration (`014_content_restructure_down.sql`)

Best-effort restore for development environments:

- Restores the **legacy** sections (`personality`, `attitudes`, `values`, `roles`, `skills`, `goal-setting`) and their legacy exercise inventory from a snapshot.
- **Does NOT restore responses or progress** (rows are permanently gone).
- Drops the `sections_group_slug_check` constraint and the `group_slug` column.

Documented as **not safe for production** in the file header. Production rollback should restore from a Supabase PITR backup, not via this script.

---

## CI flow

1. Lint: `scripts/validate-seed.ts` runs on `db/seeds/course-content.json` — must pass.
2. Test (offline): run the SQL test pair against a scratch local Postgres (`pg_tmp` or similar) — must produce RED before 014 and GREEN after.
3. Apply to staging Supabase branch via `mcp__plugin_supabase_supabase__apply_migration` once user gate passes.
4. Verify post-apply via `mcp__plugin_supabase_supabase__execute_sql` queries documented in `quickstart.md`.
