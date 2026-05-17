#!/usr/bin/env tsx
// scripts/build-migration-016.ts
//
// 006-iter6 / US3 (T048): generate db/migrations/016_personality_deep_dive.sql
// from db/seeds/course-content.json. The seed is the single source of truth.
//
// Operations (per specs/006-iter6-personality-watusi-polish/contracts/migration-016.md):
//   1. DELETE responses for the 4 NEW exercises (safety on re-run)
//   2. DELETE the 4 NEW exercise rows
//   3. UPSERT the 4 NEW rows with seed-provided content
//   4. UPDATE my-core-style to soft-hide (slide_group=NULL, order_index=99)
//   5. UPDATE attitude-types-watusi to interaction='sorted'
//
// Invocation:  tsx scripts/build-migration-016.ts

import { readFileSync, writeFileSync } from 'node:fs'

const SEED = 'db/seeds/course-content.json'
const OUT_DB = 'db/migrations/016_personality_deep_dive.sql'
const OUT_SUPABASE = 'supabase/migrations/20260518000000_016_personality_deep_dive.sql'

const NEW_SLUGS = [
  'core-style-characteristics',
  'core-style-ideal-environment',
  'core-style-traits-checklist',
  'core-style-comfort-zones',
] as const

interface Exercise {
  slug: string
  title: string
  type: string
  order_index: number
  slide_group: number | null
  is_scored: boolean
  attribution: string | null
  content_json: unknown
}

interface Section {
  slug: string
  exercises: Exercise[]
}

interface Seed {
  sections: Section[]
}

const seed: Seed = JSON.parse(readFileSync(SEED, 'utf8'))
const personality = seed.sections.find((s) => s.slug === 'personality')
const attitudes = seed.sections.find((s) => s.slug === 'attitude')
if (!personality) throw new Error('Personality section not found in seed')
if (!attitudes) throw new Error('Attitude section not found in seed')

const newRows = personality.exercises.filter((e) =>
  (NEW_SLUGS as readonly string[]).includes(e.slug)
)
if (newRows.length !== NEW_SLUGS.length) {
  throw new Error(
    `Expected ${NEW_SLUGS.length} new rows in personality seed; found ${newRows.length}`
  )
}

function sqlString(v: string | null): string {
  if (v === null) return 'NULL'
  return `'${v.replace(/'/g, "''")}'`
}
function sqlBool(v: boolean): string {
  return v ? 'true' : 'false'
}
function sqlNumOrNull(v: number | null): string {
  return v === null ? 'NULL' : String(v)
}
function sqlJsonb(v: unknown): string {
  const json = JSON.stringify(v)
  return `$json$${json}$json$::jsonb`
}

let sql = `-- db/migrations/016_personality_deep_dive.sql
--
-- Migration 016: Personality matched-style deep-dive (4 new exercises) +
-- soft-hide my-core-style + flip WATUSI ranking to interaction='sorted'.
--
-- See specs/006-iter6-personality-watusi-polish/contracts/migration-016.md
-- for the contract this migration implements.
--
-- AUTO-GENERATED from db/seeds/course-content.json by
-- scripts/build-migration-016.ts. Do not edit by hand — edit the seed and
-- re-run \`tsx scripts/build-migration-016.ts\`.
--
-- Idempotent: re-running produces zero diff. responses.exercise_id FK is NOT
-- ON DELETE CASCADE per migration 004, so the explicit DELETE in step 1 is
-- required on re-run (no-op on first run when the rows don't yet exist).

BEGIN;

-- 1. DELETE responses tied to the 4 NEW exercises (safety on re-run).
DELETE FROM public.responses
WHERE exercise_id IN (
  SELECT id FROM public.exercises
  WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'personality')
    AND slug IN (
      'core-style-characteristics',
      'core-style-ideal-environment',
      'core-style-traits-checklist',
      'core-style-comfort-zones'
    )
);

-- 2. DELETE the 4 NEW exercise rows (idempotent on re-run).
DELETE FROM public.exercises
WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'personality')
  AND slug IN (
    'core-style-characteristics',
    'core-style-ideal-environment',
    'core-style-traits-checklist',
    'core-style-comfort-zones'
  );

-- 3. UPSERT the 4 NEW exercise rows.
INSERT INTO public.exercises
  (section_id, slug, title, type, order_index, slide_group, is_scored, attribution, content_json)
VALUES
`

const valuesLines: string[] = []
for (const r of newRows) {
  const line = `  ((SELECT id FROM public.sections WHERE slug = 'personality'), ${sqlString(r.slug)}, ${sqlString(r.title)}, ${sqlString(r.type)}, ${r.order_index}, ${sqlNumOrNull(r.slide_group)}, ${sqlBool(r.is_scored)}, ${sqlString(r.attribution)}, ${sqlJsonb(r.content_json)})`
  valuesLines.push(line)
}
sql += valuesLines.join(',\n') + '\n'

sql += `ON CONFLICT (section_id, slug) DO UPDATE
SET title        = EXCLUDED.title,
    type         = EXCLUDED.type,
    order_index  = EXCLUDED.order_index,
    slide_group  = EXCLUDED.slide_group,
    is_scored    = EXCLUDED.is_scored,
    attribution  = EXCLUDED.attribution,
    content_json = EXCLUDED.content_json,
    updated_at   = now();

-- 4. Soft-hide my-core-style: slide_group=NULL excludes it from the rendered
--    slide track, order_index=99 sorts it last. Responses untouched.
UPDATE public.exercises
   SET slide_group = NULL,
       order_index = 99,
       updated_at  = now()
 WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'personality')
   AND slug = 'my-core-style';

-- 5. Flip attitude-types-watusi to interaction='sorted' (read-only sorted listing).
UPDATE public.exercises
   SET content_json = jsonb_set(content_json, '{interaction}', '"sorted"'::jsonb),
       updated_at   = now()
 WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'attitude')
   AND slug = 'attitude-types-watusi';

COMMIT;
`

writeFileSync(OUT_DB, sql)
writeFileSync(OUT_SUPABASE, sql)
console.log(`✓ Generated ${OUT_DB} (${valuesLines.length} new rows)`)
console.log(`✓ Generated ${OUT_SUPABASE} (mirror)`)
