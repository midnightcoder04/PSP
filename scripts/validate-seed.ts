#!/usr/bin/env tsx
// scripts/validate-seed.ts
//
// Enforces the contract in specs/004-content-restructure/contracts/seed-json.md
// against db/seeds/course-content.json. Zero external dependencies.
//
// Invocation:
//   npm run validate:seed
//   tsx scripts/validate-seed.ts db/seeds/course-content.json
//
// Exit code 1 on any violation; one `✖`-prefixed line per error on stderr.

import { readFileSync } from 'node:fs'

const GROUP_SLUGS = ['self-awareness', 'goal-setting', 'strategic-planning'] as const
const GROUP_ORDER: Record<string, number> = {
  'self-awareness': 1,
  'goal-setting': 2,
  'strategic-planning': 3,
}
const EXPECTED_SECTION_COUNT = 9
const EXPECTED_GROUP_COUNT = 3
const EXPECTED_GROUP_DISTRIBUTION: Record<string, number> = {
  'self-awareness': 5,
  'goal-setting': 3,
  'strategic-planning': 1,
}
const EXERCISE_TYPES = new Set([
  'checkbox',
  'text',
  'table',
  'ranking',
  'info',
  'structured-text',
  'rating-picker',
])

const SLUG_RE = /^[a-z][a-z0-9-]*[a-z0-9]$/

interface Question {
  id?: unknown
  prompt?: unknown
  placeholder?: unknown
  required?: unknown
  max_length?: unknown
}

interface ContentJson {
  questions?: Question[]
  combined?: unknown
  combined_rationale?: unknown
  intro?: unknown
  prompt?: unknown
  content?: unknown
  options?: unknown[]
  items?: unknown[]
  headers?: unknown[]
  rows?: unknown
  col_types?: unknown[]
  allow_multiple?: unknown
  scale_min?: unknown
  scale_max?: unknown
  [k: string]: unknown
}

interface Exercise {
  slug: string
  title?: string
  type: string
  order_index?: number
  content_json?: ContentJson
  attribution?: string | null
}

interface Section {
  slug: string
  title?: string
  order_index?: number
  group_slug?: string
  exercises?: Exercise[]
}

interface Seed {
  sections: Section[]
}

export interface ValidationResult {
  errors: string[]
  sectionCount: number
  exerciseCount: number
}

export function validate(seed: Seed): ValidationResult {
  const errors: string[] = []
  const push = (msg: string): void => {
    errors.push(`✖ ${msg}`)
  }
  const assert = (cond: unknown, msg: string): void => {
    if (!cond) push(msg)
  }

  // I1 — Section count + group distribution
  const sections = Array.isArray(seed.sections) ? seed.sections : []
  assert(
    sections.length === EXPECTED_SECTION_COUNT,
    `I1: expected ${EXPECTED_SECTION_COUNT} sections, got ${sections.length}`,
  )

  const groupCounts: Record<string, number> = {}
  for (const s of sections) {
    if (typeof s.group_slug !== 'string') continue
    groupCounts[s.group_slug] = (groupCounts[s.group_slug] ?? 0) + 1
  }
  const distinctGroups = Object.keys(groupCounts).filter((g) =>
    (GROUP_SLUGS as readonly string[]).includes(g),
  )
  assert(
    distinctGroups.length === EXPECTED_GROUP_COUNT,
    `I1: expected ${EXPECTED_GROUP_COUNT} distinct group_slug values, got ${distinctGroups.length} (${distinctGroups.join(', ')})`,
  )
  for (const [g, expected] of Object.entries(EXPECTED_GROUP_DISTRIBUTION)) {
    const actual = groupCounts[g] ?? 0
    assert(
      actual === expected,
      `I1: group "${g}" expected ${expected} sections, got ${actual}`,
    )
  }

  // I2 — order_index monotonicity + group ordering
  const orderIndices = sections
    .map((s) => s.order_index)
    .filter((n): n is number => typeof n === 'number')
  const uniqOrders = new Set(orderIndices)
  assert(
    uniqOrders.size === orderIndices.length,
    `I2: order_index values are not unique (${orderIndices.length} sections, ${uniqOrders.size} unique values)`,
  )
  if (orderIndices.length === sections.length && orderIndices.length > 0) {
    const sorted = [...orderIndices].sort((a, b) => a - b)
    if (sorted[0] !== 1 || sorted[sorted.length - 1] !== sorted.length) {
      push(`I2: order_index values must span [1..N] contiguously; got [${sorted.join(', ')}]`)
    }
  }
  const sortedByOrder = [...sections].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
  )
  let prevGroupOrder = 0
  for (const s of sortedByOrder) {
    const grpOrder = s.group_slug != null ? GROUP_ORDER[s.group_slug] : undefined
    if (grpOrder === undefined) continue
    if (grpOrder < prevGroupOrder) {
      push(
        `I2: section "${s.slug}" (order_index=${s.order_index}) is in group "${s.group_slug}" (order ${grpOrder}) but a previous section belonged to a later group (order ${prevGroupOrder})`,
      )
    }
    prevGroupOrder = grpOrder
  }

  // I3 — Slug constraints
  const seenSectionSlugs = new Set<string>()
  for (const s of sections) {
    if (typeof s.slug !== 'string' || !SLUG_RE.test(s.slug)) {
      push(`I3: invalid section slug ${JSON.stringify(s.slug)} (must match ${SLUG_RE})`)
      continue
    }
    if (seenSectionSlugs.has(s.slug)) {
      push(`I3: duplicate section slug "${s.slug}"`)
    }
    seenSectionSlugs.add(s.slug)
  }

  let totalExercises = 0
  for (const s of sections) {
    if (s.group_slug != null && !(GROUP_SLUGS as readonly string[]).includes(s.group_slug)) {
      push(
        `I1: section "${s.slug}" has unknown group_slug ${JSON.stringify(s.group_slug)}; must be ∈ ${GROUP_SLUGS.join('|')}`,
      )
    }
    const exercises = Array.isArray(s.exercises) ? s.exercises : []
    totalExercises += exercises.length

    const seenExerciseSlugs = new Set<string>()
    for (const [i, e] of exercises.entries()) {
      const loc = `${s.slug}/${e.slug ?? `#${i}`}`

      if (typeof e.slug !== 'string' || !SLUG_RE.test(e.slug)) {
        push(`I3: ${loc}: invalid exercise slug ${JSON.stringify(e.slug)}`)
        continue
      }
      if (seenExerciseSlugs.has(e.slug)) {
        push(`I3: ${loc}: duplicate exercise slug within section`)
      }
      seenExerciseSlugs.add(e.slug)

      // I4 — exercise type vocabulary
      if (!EXERCISE_TYPES.has(e.type)) {
        push(`I4: ${loc}: unknown exercise type ${JSON.stringify(e.type)}`)
        continue
      }

      // I5 + I6 — per-question contract and content_json shape
      const cj = e.content_json ?? {}
      const questions = Array.isArray(cj.questions) ? cj.questions : []

      if (e.type === 'structured-text') {
        if (questions.length < 1) {
          push(`I6: ${loc} (structured-text): content_json.questions must have ≥1 entry`)
        }
      } else if (e.type === 'info') {
        if (typeof cj.content !== 'string' || cj.content.length === 0) {
          push(`I6: ${loc} (info): content_json.content required (non-empty string)`)
        }
        // 006-iter6 / US3: info may carry a per-style sections map for the
        // matched-style deep-dive renderer.
        if (cj.computed === 'core_style_section') {
          const sbs = cj.sections_by_style as Record<string, unknown> | undefined
          if (!sbs || typeof sbs !== 'object') {
            push(`I6: ${loc} (info, core_style_section): content_json.sections_by_style required`)
          } else {
            for (const key of ['D', 'I', 'S', 'C'] as const) {
              const v = sbs[key]
              if (typeof v !== 'string' || v.length === 0) {
                push(`I6: ${loc} (info, core_style_section): sections_by_style.${key} must be a non-empty string`)
              }
            }
          }
          if (!Array.isArray(cj.computed_inputs) || cj.computed_inputs.length !== 2) {
            push(`I6: ${loc} (info, core_style_section): content_json.computed_inputs must be [q1_id, q2_id]`)
          }
        }
      } else if (e.type === 'checkbox') {
        // 006-iter6 / US3: checkbox may use computed='core_style_options' with
        // per-style options_by_style maps instead of a flat options list.
        if (cj.computed === 'core_style_options') {
          const obs = cj.options_by_style as Record<string, unknown> | undefined
          const expected: Record<'D' | 'I' | 'S' | 'C', number> = { D: 17, I: 16, S: 18, C: 19 }
          if (!obs || typeof obs !== 'object') {
            push(`I6: ${loc} (checkbox, core_style_options): content_json.options_by_style required`)
          } else {
            for (const key of ['D', 'I', 'S', 'C'] as const) {
              const arr = obs[key]
              if (!Array.isArray(arr)) {
                push(`I6: ${loc} (checkbox, core_style_options): options_by_style.${key} must be an array`)
              } else if (arr.length !== expected[key]) {
                push(
                  `I6: ${loc} (checkbox, core_style_options): options_by_style.${key} must have exactly ${expected[key]} entries (found ${arr.length})`,
                )
              }
            }
          }
          if (!Array.isArray(cj.computed_inputs) || cj.computed_inputs.length !== 2) {
            push(`I6: ${loc} (checkbox, core_style_options): content_json.computed_inputs must be [q1_id, q2_id]`)
          }
        } else {
          if (!Array.isArray(cj.options) || cj.options.length < 1) {
            push(`I6: ${loc} (checkbox): content_json.options must have ≥1 entry`)
          }
          if (typeof cj.allow_multiple !== 'boolean') {
            push(`I6: ${loc} (checkbox): content_json.allow_multiple boolean required`)
          }
        }
      } else if (e.type === 'ranking') {
        if (!Array.isArray(cj.items) || cj.items.length < 2) {
          push(`I6: ${loc} (ranking): content_json.items must have ≥2 entries`)
        }
        // 006-iter6 / US1: interaction='sorted' requires derives_from
        if (cj.interaction === 'sorted' && !cj.derives_from) {
          push(`I6: ${loc} (ranking): interaction='sorted' requires content_json.derives_from to be set`)
        }
      } else if (e.type === 'table') {
        if (!Array.isArray(cj.headers) || cj.headers.length === 0) {
          push(`I6: ${loc} (table): content_json.headers required`)
        }
        if (cj.rows == null) {
          push(`I6: ${loc} (table): content_json.rows required`)
        }
      } else if (e.type === 'rating-picker') {
        if (!Array.isArray(cj.items) || cj.items.length < 1) {
          push(`I6: ${loc} (rating-picker): content_json.items must have ≥1 entry`)
        }
        // Accept both shapes: top-level scale_min/scale_max OR nested scale.{min,max}
        const nestedScale = cj.scale as { min?: unknown; max?: unknown } | undefined
        const hasTopLevel =
          typeof cj.scale_min === 'number' && typeof cj.scale_max === 'number'
        const hasNested =
          nestedScale != null &&
          typeof nestedScale.min === 'number' &&
          typeof nestedScale.max === 'number'
        if (!hasTopLevel && !hasNested) {
          push(
            `I6: ${loc} (rating-picker): require either content_json.scale_min/scale_max (numbers) or content_json.scale.{min,max} (numbers)`,
          )
        }
      } else if (e.type === 'text') {
        const hasPrompt = typeof cj.prompt === 'string' && cj.prompt.length > 0
        const hasSingleQuestion = questions.length === 1
        if (!hasPrompt && !hasSingleQuestion) {
          push(
            `I6: ${loc} (text): either content_json.prompt or a single content_json.questions[0] is required`,
          )
        }
      }

      // I5 — per-question rules (apply to structured-text always, and text when N>=2)
      const applyPerQuestion =
        e.type === 'structured-text' || (e.type === 'text' && questions.length >= 2)

      if (applyPerQuestion && questions.length >= 2) {
        const combined = cj.combined === true
        if (combined) {
          const rationale = cj.combined_rationale
          if (typeof rationale !== 'string' || rationale.length < 20) {
            push(
              `I5: ${loc}: combined=true requires combined_rationale (non-empty string ≥20 chars)`,
            )
          }
        }
      }

      if (applyPerQuestion) {
        const seenIds = new Set<string>()
        for (const [qi, q] of questions.entries()) {
          const qloc = `${loc}.questions[${qi}]`
          if (typeof q.id !== 'string' || q.id.length === 0) {
            push(`I5: ${qloc}: question.id required (non-empty string)`)
          } else {
            if (seenIds.has(q.id)) {
              push(`I8: ${qloc}: duplicate question id "${q.id}" within exercise`)
            }
            seenIds.add(q.id)
          }
          if (typeof q.prompt !== 'string' || q.prompt.length < 5) {
            push(`I5: ${qloc}: question.prompt must be a string with ≥5 chars`)
          }
          if (q.required !== undefined && typeof q.required !== 'boolean') {
            push(`I5: ${qloc}: question.required must be boolean if present`)
          }
        }
      }
    }
  }

  return { errors, sectionCount: sections.length, exerciseCount: totalExercises }
}

function main(): void {
  const path = process.argv[2] ?? 'db/seeds/course-content.json'
  let raw: string
  try {
    raw = readFileSync(path, 'utf-8')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`✖ cannot read seed file at ${path}: ${message}\n`)
    process.exit(1)
  }

  let seed: Seed
  try {
    seed = JSON.parse(raw) as Seed
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`✖ ${path} is not valid JSON: ${message}\n`)
    process.exit(1)
  }

  const result = validate(seed)
  if (result.errors.length > 0) {
    for (const line of result.errors) process.stderr.write(`${line}\n`)
    process.exit(1)
  }
  process.stdout.write(
    `✓ ${result.sectionCount} sections, ${result.exerciseCount} exercises — clean.\n`,
  )
}

// Run main only when invoked directly (not when imported by tests).
const isMain = typeof process !== 'undefined' && process.argv[1]?.endsWith('validate-seed.ts')
if (isMain) main()
