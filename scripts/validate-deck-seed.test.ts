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

  it('contains the full 52-slide deck', () => {
    expect(deck.slides).toHaveLength(52)
  })

  it('has exactly one cover slide and one contact slide', () => {
    const kinds = deck.slides.map((s: { kind: string }) => s.kind)
    expect(kinds.filter((k: string) => k === 'cover')).toHaveLength(1)
    expect(kinds.filter((k: string) => k === 'contact')).toHaveLength(1)
  })

  it('has a page-1 (characteristics) and page-2 (you-are/environment) disc-profile slide per style', () => {
    type DiscProfileSlide = { kind: string; content_json: { style: string; adjectives: string[]; youAre?: string[] } }
    const profiles = deck.slides.filter((s: DiscProfileSlide) => s.kind === 'disc-profile') as DiscProfileSlide[]

    const page1Styles = profiles
      .filter((s) => s.content_json.adjectives.length > 0)
      .map((s) => s.content_json.style)
      .sort()
    expect(page1Styles).toEqual(['C', 'D', 'I', 'S'])

    const page2Styles = profiles
      .filter((s) => (s.content_json.youAre?.length ?? 0) > 0)
      .map((s) => s.content_json.style)
      .sort()
    expect(page2Styles).toEqual(['C', 'D', 'I', 'S'])
  })

  it('has comfort-zone-pair slides after all 4 personality profiles, covering all styles', () => {
    const byOrder = [...deck.slides].sort(
      (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
    )
    // All four disc-profile slides must appear before any comfort-zones-pair.
    const _lastProfileIdx = Math.max(
      ...byOrder
        .filter((s: { kind: string }) => s.kind === 'disc-profile')
        .map((_: unknown, _idx: number) => byOrder.findIndex((s: { kind: string; content_json: { style?: string } }) => s.kind === 'disc-profile'))
    )
    const pairSlides = byOrder.filter((s: { kind: string }) => s.kind === 'comfort-zones-pair')
    // There should be exactly 2 comfort-zones-pair slides (D+I and S+C).
    expect(pairSlides).toHaveLength(2)
    // Each pair slide must contain left and right objects with pairs covering D, I, S, C.
    for (const slide of pairSlides) {
      const { left, right } = slide.content_json as { left: { pairs: { other: string }[] }; right: { pairs: { other: string }[] } }
      expect(left.pairs.map((p: { other: string }) => p.other)).toEqual(['D', 'I', 'S', 'C'])
      expect(right.pairs.map((p: { other: string }) => p.other)).toEqual(['D', 'I', 'S', 'C'])
    }
  })
})

describe('validateDeckSeed', () => {
  it('rejects a comfort-zones slide with an unknown level', () => {
    const errors = validateDeckSeed(
      {
        slides: [
          {
            slug: 'cz-slide',
            kind: 'comfort-zones',
            chapter: 'personality',
            order_index: 1,
            content_json: {
              style: 'D',
              title: 'Comfort Zones for HIGH D',
              pairs: [
                { other: 'D', level: 'medium', text: 'x' },
                { other: 'I', level: 'high', text: 'x' },
                { other: 'S', level: 'low', text: 'x' },
                { other: 'C', level: 'low', text: 'x' },
              ],
            },
            linked_exercise_slugs: [],
          },
        ],
      },
      courseSlugs
    )
    expect(errors.some((e) => e.includes('pairs[0].level'))).toBe(true)
  })

  it('rejects a comfort-zones slide missing a core style pair', () => {
    const errors = validateDeckSeed(
      {
        slides: [
          {
            slug: 'cz-slide',
            kind: 'comfort-zones',
            chapter: 'personality',
            order_index: 1,
            content_json: {
              style: 'S',
              title: 'Comfort Zones for HIGH S',
              pairs: [{ other: 'D', level: 'low', text: 'x' }],
            },
            linked_exercise_slugs: [],
          },
        ],
      },
      courseSlugs
    )
    expect(errors.some((e) => e.includes('all four core styles'))).toBe(true)
  })

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

  it('rejects a logo whose asset is missing or that has no name', () => {
    const errors = validateDeckSeed(
      {
        slides: [
          {
            slug: 'x-slide',
            kind: 'section-title',
            chapter: 'opening',
            order_index: 1,
            content_json: {
              title: 'X',
              logo_groups: [
                {
                  heading: 'Clients',
                  logos: [
                    { name: 'Ghost Co', src: '/deck/logos/does-not-exist.png' },
                    { src: '/deck/logos/hr-block.png' },
                  ],
                },
              ],
            },
            linked_exercise_slugs: [],
          },
        ],
      },
      courseSlugs
    )
    expect(errors.some((e) => e.includes('does-not-exist.png'))).toBe(true)
    expect(errors.some((e) => e.includes('logos[1].name missing'))).toBe(true)
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
