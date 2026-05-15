import { describe, it, expect } from 'vitest'
import { computeSectionLocks } from './useSectionLock'
import type { Section, Progress } from '@/types/database'

function section(slug: string, order: number): Section {
  return {
    id: `sec-${slug}`,
    slug,
    title: slug.charAt(0).toUpperCase() + slug.slice(1),
    subtitle: null,
    description: null,
    order_index: order,
    icon_name: null,
    framing: null,
    group_slug: null,
  }
}

function progress(sectionId: string, completedAt: string | null): Progress {
  return {
    id: `pg-${sectionId}`,
    participant_id: 'p1',
    section_id: sectionId,
    session_id: null,
    completed_exercises: 5,
    total_exercises: 5,
    section_completed_at: completedAt,
    last_exercise_id: null,
    last_activity_at: '2026-01-01T00:00:00Z',
  }
}

describe('computeSectionLocks', () => {
  const sections = [
    section('personality', 0),
    section('attitudes', 1),
    section('values', 2),
  ]

  it('marks section 0 as never locked', () => {
    const locks = computeSectionLocks(sections, new Map())
    expect(locks[0].isLocked).toBe(false)
    expect(locks[0].prereq).toBeNull()
  })

  it('marks sections beyond first as locked when no progress for prior', () => {
    const locks = computeSectionLocks(sections, new Map())
    expect(locks[1].isLocked).toBe(true)
    expect(locks[1].prereq?.slug).toBe('personality')
  })

  it('unlocks section N when section N-1 is completed', () => {
    const map = new Map<string, Progress>([
      ['sec-personality', progress('sec-personality', '2026-05-01T00:00:00Z')],
    ])
    const locks = computeSectionLocks(sections, map)
    expect(locks[0].isLocked).toBe(false)
    expect(locks[1].isLocked).toBe(false)
    expect(locks[2].isLocked).toBe(true) // attitudes still incomplete
  })

  it('treats section_completed_at = null as not-yet-complete', () => {
    const map = new Map<string, Progress>([
      ['sec-personality', progress('sec-personality', null)],
    ])
    const locks = computeSectionLocks(sections, map)
    expect(locks[1].isLocked).toBe(true)
  })

  it('exposes prereqTitle on locked sections', () => {
    const locks = computeSectionLocks(sections, new Map())
    expect(locks[1].prereqTitle).toBe('Personality')
  })
})
