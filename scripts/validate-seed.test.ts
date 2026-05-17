// Vitest mirror of scripts/validate-seed.ts — exercises I1–I8 with synthetic fixtures
// per specs/004-content-restructure/contracts/seed-json.md.

import { describe, expect, it } from 'vitest'
import { validate } from './validate-seed'

type Seed = Parameters<typeof validate>[0]

function makeSection(overrides: Partial<Seed['sections'][number]> = {}): Seed['sections'][number] {
  return {
    slug: 'self-awareness-one',
    title: 'Self Awareness One',
    order_index: 1,
    group_slug: 'self-awareness',
    exercises: [],
    ...overrides,
  }
}

function nineValidSections(): Seed['sections'] {
  return [
    makeSection({ slug: 'personality',                       title: 'Personality',                       order_index: 1, group_slug: 'self-awareness' }),
    makeSection({ slug: 'attitude',                          title: 'Attitude',                          order_index: 2, group_slug: 'self-awareness' }),
    makeSection({ slug: 'values',                            title: 'Values',                            order_index: 3, group_slug: 'self-awareness' }),
    makeSection({ slug: 'roles-and-demands',                 title: 'Roles and Demands',                 order_index: 4, group_slug: 'self-awareness' }),
    makeSection({ slug: 'transferable-skills',               title: 'Transferable Marketable Skills',    order_index: 5, group_slug: 'self-awareness' }),
    makeSection({ slug: 'specific-goals',                    title: 'Specific Goals',                    order_index: 6, group_slug: 'goal-setting' }),
    makeSection({ slug: 'goal-impact-matrix',                title: 'Goal Impact Matrix',                order_index: 7, group_slug: 'goal-setting' }),
    makeSection({ slug: 'visualization',                     title: 'Visualization',                     order_index: 8, group_slug: 'goal-setting' }),
    makeSection({ slug: 'removing-obstacles-achieving-goals', title: 'Removing Obstacles, Achieving Goals', order_index: 9, group_slug: 'strategic-planning' }),
  ]
}

describe('validate-seed I1 (section count + group distribution)', () => {
  it('passes the canonical 9/3 shape', () => {
    const result = validate({ sections: nineValidSections() })
    expect(result.errors).toEqual([])
    expect(result.sectionCount).toBe(9)
  })

  it('flags a section count other than 9', () => {
    const result = validate({ sections: nineValidSections().slice(0, 6) })
    expect(result.errors.some((e) => e.startsWith('✖ I1: expected 9 sections'))).toBe(true)
  })

  it('flags wrong group distribution', () => {
    const sections = nineValidSections()
    sections[5].group_slug = 'self-awareness'
    const result = validate({ sections })
    expect(result.errors.some((e) => e.includes('I1: group "self-awareness" expected 5'))).toBe(true)
  })
})

describe('validate-seed I2 (order_index)', () => {
  it('flags duplicate order_index', () => {
    const sections = nineValidSections()
    sections[1].order_index = 1
    const result = validate({ sections })
    expect(result.errors.some((e) => e.includes('I2: order_index values are not unique'))).toBe(true)
  })

  it('flags out-of-group ordering', () => {
    const sections = nineValidSections()
    const tmp = sections[5].order_index
    sections[5].order_index = sections[0].order_index
    sections[0].order_index = tmp
    const result = validate({ sections })
    expect(result.errors.some((e) => e.startsWith('✖ I2'))).toBe(true)
  })
})

describe('validate-seed I3 (slug constraints)', () => {
  it('flags invalid section slug', () => {
    const sections = nineValidSections()
    sections[0].slug = 'Bad_Slug'
    const result = validate({ sections })
    expect(result.errors.some((e) => e.startsWith('✖ I3'))).toBe(true)
  })

  it('flags duplicate exercise slug within a section', () => {
    const sections = nineValidSections()
    sections[0].exercises = [
      { slug: 'foo', type: 'info', content_json: { content: 'hi' } },
      { slug: 'foo', type: 'info', content_json: { content: 'bye' } },
    ]
    const result = validate({ sections })
    expect(result.errors.some((e) => e.includes('duplicate exercise slug'))).toBe(true)
  })
})

describe('validate-seed I4 (exercise type vocabulary)', () => {
  it('flags unknown exercise type', () => {
    const sections = nineValidSections()
    sections[0].exercises = [
      { slug: 'foo', type: 'unsupported', content_json: {} } as never,
    ]
    const result = validate({ sections })
    expect(result.errors.some((e) => e.startsWith('✖ I4'))).toBe(true)
  })
})

describe('validate-seed I5 (per-question contract)', () => {
  it('passes when structured-text questions all have id+prompt', () => {
    const sections = nineValidSections()
    sections[0].exercises = [
      {
        slug: 'mission-statement',
        type: 'structured-text',
        content_json: {
          questions: [
            { id: 'a', prompt: 'Prompt A text here.' },
            { id: 'b', prompt: 'Prompt B text here.' },
          ],
        },
      },
    ]
    const result = validate({ sections })
    expect(result.errors).toEqual([])
  })

  it('flags missing combined_rationale when combined=true', () => {
    const sections = nineValidSections()
    sections[0].exercises = [
      {
        slug: 'mission-statement',
        type: 'structured-text',
        content_json: {
          combined: true,
          questions: [
            { id: 'a', prompt: 'Prompt A text here.' },
            { id: 'b', prompt: 'Prompt B text here.' },
          ],
        },
      },
    ]
    const result = validate({ sections })
    expect(result.errors.some((e) => e.includes('combined_rationale'))).toBe(true)
  })

  it('flags short prompts (<5 chars)', () => {
    const sections = nineValidSections()
    sections[0].exercises = [
      {
        slug: 'mission-statement',
        type: 'structured-text',
        content_json: {
          questions: [
            { id: 'a', prompt: 'hi' },
            { id: 'b', prompt: 'Long enough prompt.' },
          ],
        },
      },
    ]
    const result = validate({ sections })
    expect(result.errors.some((e) => e.includes('prompt must be a string with ≥5 chars'))).toBe(
      true,
    )
  })

  it('flags multi-prompt text exercise without combined+rationale split', () => {
    const sections = nineValidSections()
    sections[0].exercises = [
      {
        slug: 'top-three-values',
        type: 'text',
        content_json: {
          questions: [
            { id: 'a', prompt: 'one' },
            { id: 'b', prompt: 'two' },
          ],
        },
      },
    ]
    const result = validate({ sections })
    expect(result.errors.some((e) => e.startsWith('✖ I5'))).toBe(true)
  })
})

describe('validate-seed I6 (content_json shape per type)', () => {
  it('flags info exercise missing content', () => {
    const sections = nineValidSections()
    sections[0].exercises = [{ slug: 'note', type: 'info', content_json: {} }]
    const result = validate({ sections })
    expect(result.errors.some((e) => e.includes('I6') && e.includes('info'))).toBe(true)
  })

  it('flags checkbox missing options/allow_multiple', () => {
    const sections = nineValidSections()
    sections[0].exercises = [{ slug: 'chk', type: 'checkbox', content_json: {} }]
    const result = validate({ sections })
    const hasOptionsErr = result.errors.some((e) => e.includes('options'))
    const hasAllowErr = result.errors.some((e) => e.includes('allow_multiple'))
    expect(hasOptionsErr).toBe(true)
    expect(hasAllowErr).toBe(true)
  })

  it('flags table missing headers/rows', () => {
    const sections = nineValidSections()
    sections[0].exercises = [{ slug: 'tbl', type: 'table', content_json: {} }]
    const result = validate({ sections })
    expect(result.errors.some((e) => e.includes('headers'))).toBe(true)
    expect(result.errors.some((e) => e.includes('rows'))).toBe(true)
  })

  it('flags rating-picker missing scale', () => {
    const sections = nineValidSections()
    sections[0].exercises = [
      { slug: 'rp', type: 'rating-picker', content_json: { items: [{ id: 'x', label: 'X' }] } },
    ]
    const result = validate({ sections })
    expect(result.errors.some((e) => e.includes('rating-picker'))).toBe(true)
  })

  it('accepts rating-picker with nested scale.{min,max}', () => {
    const sections = nineValidSections()
    sections[0].exercises = [
      {
        slug: 'rp',
        type: 'rating-picker',
        content_json: { items: [{ id: 'x', label: 'X' }], scale: { min: 1, max: 5 } },
      },
    ]
    const result = validate({ sections })
    expect(result.errors).toEqual([])
  })
})

describe('validate-seed I8 (question id uniqueness)', () => {
  it('flags duplicate question ids', () => {
    const sections = nineValidSections()
    sections[0].exercises = [
      {
        slug: 'mission-statement',
        type: 'structured-text',
        content_json: {
          questions: [
            { id: 'dup', prompt: 'Prompt one text.' },
            { id: 'dup', prompt: 'Prompt two text.' },
          ],
        },
      },
    ]
    const result = validate({ sections })
    expect(result.errors.some((e) => e.startsWith('✖ I8'))).toBe(true)
  })
})
