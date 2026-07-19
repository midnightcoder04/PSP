// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateDeckSeed, loadCourseExerciseSlugs } from './validate-deck-seed.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const deckPath = resolve(__dirname, '../db/seeds/deck-slides.json')
const coursePath = resolve(__dirname, '../db/seeds/course-content.json')

const deck = JSON.parse(readFileSync(deckPath, 'utf-8'))
const courseSlugs = loadCourseExerciseSlugs(coursePath)

describe('deck-slides.json seed', () => {
  it('passes validation with zero errors', () => {
    const errors = validateDeckSeed(deck, courseSlugs)
    expect(errors, errors.join('\n')).toEqual([])
  })

  it('contains the full 49-slide deck', () => {
    expect(deck.slides).toHaveLength(49)
  })

  it('has exactly one cover slide and one contact slide', () => {
    const kinds = deck.slides.map((s: { kind: string }) => s.kind)
    expect(kinds.filter((k: string) => k === 'cover')).toHaveLength(1)
    expect(kinds.filter((k: string) => k === 'contact')).toHaveLength(1)
  })

  it('has all four DISC profile slides', () => {
    const styles = deck.slides
      .filter((s: { kind: string }) => s.kind === 'disc-profile')
      .map((s: { content_json: { style: string } }) => s.content_json.style)
      .sort()
    expect(styles).toEqual(['C', 'D', 'I', 'S'])
  })
})

describe('validateDeckSeed', () => {
  it('rejects an unknown kind', () => {
    const errors = validateDeckSeed(
      { slides: [{ slug: 'x-slide', kind: 'nope', chapter: 'opening', order_index: 1, content_json: {}, linked_exercise_slugs: [] }] },
      courseSlugs
    )
    expect(errors.some((e) => e.includes('kind'))).toBe(true)
  })

  it('rejects a linked exercise slug that is not in course content', () => {
    const errors = validateDeckSeed(
      {
        slides: [
          {
            slug: 'x-slide',
            kind: 'section-title',
            chapter: 'values',
            order_index: 1,
            content_json: { title: 'X' },
            linked_exercise_slugs: ['not-a-real-exercise'],
          },
        ],
      },
      courseSlugs
    )
    expect(errors.some((e) => e.includes('not-a-real-exercise'))).toBe(true)
  })

  it('rejects duplicate slugs and order_index', () => {
    const slide = {
      slug: 'dup-slide',
      kind: 'section-title' as const,
      chapter: 'values',
      order_index: 1,
      content_json: { title: 'X' },
      linked_exercise_slugs: [],
    }
    const errors = validateDeckSeed({ slides: [slide, { ...slide }] }, courseSlugs)
    expect(errors.some((e) => e.includes('duplicate slug'))).toBe(true)
    expect(errors.some((e) => e.includes('duplicate order_index'))).toBe(true)
  })

  it('rejects a missing image asset path', () => {
    const errors = validateDeckSeed(
      {
        slides: [
          {
            slug: 'x-slide',
            kind: 'image',
            chapter: 'opening',
            order_index: 1,
            content_json: { src: '/deck/does-not-exist.png' },
            linked_exercise_slugs: [],
          },
        ],
      },
      courseSlugs
    )
    expect(errors.some((e) => e.includes('does-not-exist.png'))).toBe(true)
  })
})
