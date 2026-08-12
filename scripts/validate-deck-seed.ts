#!/usr/bin/env tsx
// scripts/validate-deck-seed.ts
//
// Validates db/seeds/deck-slides.json (the facilitator presentation deck)
// against the deck_slides schema in migration 034 and the per-kind content
// shapes in src/types/database.ts. Zero external dependencies.
//
// Invocation:
//   npm run validate:deck
//   tsx scripts/validate-deck-seed.ts db/seeds/deck-slides.json
//
// Exit code 1 on any violation; one `✖`-prefixed line per error on stderr.

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DECK_KINDS = new Set([
  'cover',
  'section-title',
  'quote',
  'statement',
  'bullets',
  'two-col',
  'disc-profile',
  'comfort-zones',
  'comfort-zones-pair',
  'numbered-list',
  'image',
  'contact',
  'attitude-conflict-matrix',
])

const DECK_CHAPTERS = new Set([
  'opening',
  'personality',
  'attitudes',
  'values',
  'roles',
  'skills',
  'goals',
  'closing',
])

const SLUG_RE = /^[a-z][a-z0-9-]*[a-z0-9]$/

// comfort-zones slides pair the slide's style against every core style, in the
// canonical D-I-S-C order, sized by one of four Comfort Zone levels.
const CORE_STYLES = ['D', 'I', 'S', 'C']
const COMFORT_LEVELS = new Set(['low', 'moderate', 'high', 'very-high'])

// Required string fields per kind (arrays validated separately)
const REQUIRED_STRINGS: Record<string, string[]> = {
  cover: ['title'],
  'section-title': ['title'],
  quote: ['quote', 'attribution'],
  statement: ['title', 'body'],
  bullets: ['title'],
  'two-col': ['title'],
  'disc-profile': ['style', 'title'],
  'comfort-zones': ['style', 'title'],
  'comfort-zones-pair': [], // validated via nested left/right objects
  'numbered-list': ['title'],
  image: ['src'],
  contact: ['title'],
  'attitude-conflict-matrix': ['title'],
}

interface DeckSlideSeed {
  slug?: unknown
  kind?: unknown
  chapter?: unknown
  order_index?: unknown
  content_json?: Record<string, unknown>
  linked_exercise_slugs?: unknown
  notes?: unknown
}

export function validateDeckSeed(
  deckJson: { slides?: DeckSlideSeed[] },
  courseExerciseSlugs: Set<string>
): string[] {
  const errors: string[] = []
  const slides = deckJson.slides

  if (!Array.isArray(slides) || slides.length === 0) {
    return ['deck seed must have a non-empty "slides" array']
  }

  const seenSlugs = new Set<string>()
  const seenOrder = new Set<number>()

  slides.forEach((slide, i) => {
    const label = typeof slide.slug === 'string' ? slide.slug : `slides[${i}]`

    // slug
    if (typeof slide.slug !== 'string' || !SLUG_RE.test(slide.slug)) {
      errors.push(`${label}: slug missing or not kebab-case`)
    } else if (seenSlugs.has(slide.slug)) {
      errors.push(`${label}: duplicate slug`)
    } else {
      seenSlugs.add(slide.slug)
    }

    // kind
    if (typeof slide.kind !== 'string' || !DECK_KINDS.has(slide.kind)) {
      errors.push(`${label}: kind "${String(slide.kind)}" not in ${[...DECK_KINDS].join('|')}`)
      return
    }

    // chapter
    if (typeof slide.chapter !== 'string' || !DECK_CHAPTERS.has(slide.chapter)) {
      errors.push(`${label}: chapter "${String(slide.chapter)}" not in ${[...DECK_CHAPTERS].join('|')}`)
    }

    // order_index
    if (typeof slide.order_index !== 'number' || !Number.isInteger(slide.order_index)) {
      errors.push(`${label}: order_index missing or not an integer`)
    } else if (seenOrder.has(slide.order_index)) {
      errors.push(`${label}: duplicate order_index ${slide.order_index}`)
    } else {
      seenOrder.add(slide.order_index)
    }

    // content_json per-kind required fields
    const c = slide.content_json
    if (!c || typeof c !== 'object') {
      errors.push(`${label}: content_json missing`)
      return
    }
    for (const field of REQUIRED_STRINGS[slide.kind]) {
      if (typeof c[field] !== 'string' || (c[field] as string).length === 0) {
        errors.push(`${label}: content_json.${field} missing (required for kind=${slide.kind})`)
      }
    }
    if (slide.kind === 'disc-profile') {
      if (!['D', 'I', 'S', 'C'].includes(String(c.style))) {
        errors.push(`${label}: disc-profile style must be D|I|S|C`)
      }
      if (!Array.isArray(c.adjectives) || !Array.isArray(c.statements)) {
        errors.push(`${label}: disc-profile needs adjectives[] and statements[]`)
      }
    }
    if (slide.kind === 'comfort-zones') {
      if (!['D', 'I', 'S', 'C'].includes(String(c.style))) {
        errors.push(`${label}: comfort-zones style must be D|I|S|C`)
      }
      // One pair per core style, in D-I-S-C order, each with a Venn size.
      const pairs = c.pairs
      if (!Array.isArray(pairs) || pairs.length !== 4) {
        errors.push(`${label}: comfort-zones needs pairs[] with all four core styles`)
      } else {
        pairs.forEach((pair, pi) => {
          const p = pair as Record<string, unknown>
          if (p.other !== CORE_STYLES[pi]) {
            errors.push(`${label}: pairs[${pi}].other must be "${CORE_STYLES[pi]}" (D-I-S-C order)`)
          }
          if (!COMFORT_LEVELS.has(String(p.level))) {
            errors.push(`${label}: pairs[${pi}].level must be ${[...COMFORT_LEVELS].join('|')}`)
          }
          if (typeof p.text !== 'string' || p.text.length === 0) {
            errors.push(`${label}: pairs[${pi}].text missing`)
          }
        })
      }
    }
    if (slide.kind === 'bullets' && !Array.isArray(c.bullets)) {
      errors.push(`${label}: bullets kind needs bullets[]`)
    }
    if (slide.kind === 'numbered-list' && !Array.isArray(c.items)) {
      errors.push(`${label}: numbered-list kind needs items[]`)
    }
    if (slide.kind === 'contact' && !Array.isArray(c.lines)) {
      errors.push(`${label}: contact kind needs lines[]`)
    }
    if (slide.kind === 'two-col') {
      const cols = c.columns
      if (!Array.isArray(cols) || cols.length < 2) {
        errors.push(`${label}: two-col kind needs columns[] with at least 2 columns`)
      } else {
        cols.forEach((col, ci) => {
          const colObj = col as Record<string, unknown>
          if (typeof colObj.heading !== 'string' || !Array.isArray(colObj.bullets)) {
            errors.push(`${label}: columns[${ci}] needs heading + bullets[]`)
          }
        })
      }
    }

    // optional client/partner logo wall (section-title slides)
    if (c.logo_groups !== undefined) {
      if (!Array.isArray(c.logo_groups) || c.logo_groups.length === 0) {
        errors.push(`${label}: logo_groups must be a non-empty array`)
      } else {
        c.logo_groups.forEach((group, gi) => {
          const g = group as Record<string, unknown>
          if (typeof g.heading !== 'string' || g.heading.length === 0) {
            errors.push(`${label}: logo_groups[${gi}].heading missing`)
          }
          if (!Array.isArray(g.logos) || g.logos.length === 0) {
            errors.push(`${label}: logo_groups[${gi}].logos must be a non-empty array`)
            return
          }
          g.logos.forEach((logo, li) => {
            const l = logo as Record<string, unknown>
            if (typeof l.name !== 'string' || l.name.length === 0) {
              errors.push(`${label}: logo_groups[${gi}].logos[${li}].name missing`)
            }
            if (typeof l.src !== 'string' || l.src.length === 0) {
              errors.push(`${label}: logo_groups[${gi}].logos[${li}].src missing`)
            } else if (l.src.startsWith('/') && !existsSync(resolve(__dirname, '../public', l.src.slice(1)))) {
              errors.push(`${label}: logo "${l.src}" not found under public/`)
            }
          })
        })
      }
    }

    // image paths must exist under public/
    for (const key of ['image', 'src'] as const) {
      const v = c[key]
      if (typeof v === 'string' && v.startsWith('/')) {
        const p = resolve(__dirname, '../public', v.slice(1))
        if (!existsSync(p)) {
          errors.push(`${label}: content_json.${key} "${v}" not found under public/`)
        }
      }
    }

    // linked_exercise_slugs must resolve against course content
    if (!Array.isArray(slide.linked_exercise_slugs)) {
      errors.push(`${label}: linked_exercise_slugs must be an array`)
    } else {
      for (const ex of slide.linked_exercise_slugs) {
        if (typeof ex !== 'string' || !courseExerciseSlugs.has(ex)) {
          errors.push(`${label}: linked exercise "${String(ex)}" not found in course-content.json`)
        }
      }
    }
  })

  return errors
}

export function loadCourseExerciseSlugs(courseSeedPath: string): Set<string> {
  const course = JSON.parse(readFileSync(courseSeedPath, 'utf-8')) as {
    sections: { exercises?: { slug: string }[] }[]
  }
  const slugs = new Set<string>()
  for (const section of course.sections) {
    for (const ex of section.exercises ?? []) slugs.add(ex.slug)
  }
  return slugs
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

const isDirectRun = process.argv[1]?.endsWith('validate-deck-seed.ts')

if (isDirectRun) {
  const deckPath = process.argv[2] ?? resolve(__dirname, '../db/seeds/deck-slides.json')
  const coursePath = resolve(__dirname, '../db/seeds/course-content.json')

  const deck = JSON.parse(readFileSync(deckPath, 'utf-8'))
  const courseSlugs = loadCourseExerciseSlugs(coursePath)
  const errors = validateDeckSeed(deck, courseSlugs)

  if (errors.length > 0) {
    for (const e of errors) console.error(`✖ ${e}`)
    process.exit(1)
  }
  console.log(`✓ deck seed valid (${deck.slides.length} slides)`)
}
