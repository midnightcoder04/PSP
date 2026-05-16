#!/usr/bin/env tsx
// scripts/build-migration-015.ts
//
// 005-iter5-ux-fixes / US5 (T067): generate db/migrations/015_personality_quiz.sql
// from db/seeds/course-content.json. The seed is the single source of truth;
// re-running this script after editing the seed re-emits the migration
// deterministically.
//
// Contract: specs/005-iter5-ux-fixes/contracts/migration-015.md
//
// Invocation:  tsx scripts/build-migration-015.ts

import { readFileSync, writeFileSync } from 'node:fs'

const SEED = 'db/seeds/course-content.json'
const OUT = 'db/migrations/015_personality_quiz.sql'

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
if (!personality) {
  throw new Error('Personality section not found in seed')
}
const rows = personality.exercises

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
  // Use dollar-quoting with a tag unlikely to appear in content.
  const json = JSON.stringify(v)
  return `$json$${json}$json$::jsonb`
}

let sql = `-- db/migrations/015_personality_quiz.sql
--
-- Migration 015: Personality section reshape — two-question Core Style quiz
-- plus four DISC profile read-throughs (specs/005-iter5-ux-fixes).
--
-- See specs/005-iter5-ux-fixes/contracts/migration-015.md for the contract
-- this migration implements.
--
-- AUTO-GENERATED from db/seeds/course-content.json by
-- scripts/build-migration-015.ts. Do not edit by hand — edit the seed and
-- re-run \`tsx scripts/build-migration-015.ts\`.
--
-- DESTRUCTIVE: deletes 5 Personality exercise rows (identifying-personal-style
-- + 4 disc-core-style-*) and any responses cascade-FK'd to them.
-- Pre-production-safe per spec Assumption A-2 (user confirmation 2026-05-16).
--
-- Idempotent: re-running produces zero diff (DELETE allow-list + UPSERT).

BEGIN;

-- 1a. DELETE responses tied to the 5 removed exercises (the FK from
--     responses.exercise_id → exercises.id is NOT cascade per migration 004,
--     so we must scope the wipe explicitly).
DELETE FROM public.responses
WHERE exercise_id IN (
  SELECT id FROM public.exercises
  WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'personality')
    AND slug IN (
      'identifying-personal-style',
      'disc-core-style-d',
      'disc-core-style-i',
      'disc-core-style-s',
      'disc-core-style-c'
    )
);

-- 1b. DELETE the 5 removed exercise rows.
DELETE FROM public.exercises
WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'personality')
  AND slug IN (
    'identifying-personal-style',
    'disc-core-style-d',
    'disc-core-style-i',
    'disc-core-style-s',
    'disc-core-style-c'
  );

-- 2. UPSERT the post-migration row inventory (9 rows) per
--    specs/005-iter5-ux-fixes/contracts/personality-exercises.md.
INSERT INTO public.exercises
  (section_id, slug, title, type, order_index, slide_group, is_scored, attribution, content_json)
VALUES
`

const valuesLines: string[] = []
for (const r of rows) {
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

COMMIT;
`

writeFileSync(OUT, sql)
console.log(`✓ Generated ${OUT} (${valuesLines.length} rows)`)
