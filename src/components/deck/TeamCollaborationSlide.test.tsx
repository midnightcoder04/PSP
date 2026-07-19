import { describe, it, expect } from 'vitest'
import { deriveTeamProfiles } from './TeamCollaborationSlide'
import type { LiveResponseRow } from '@/hooks/usePresentationResponses'
import type { Json } from '@/types/database'

function row(
  participant_id: string,
  display_name: string,
  exercise_slug: string,
  response_json: Json | null
): LiveResponseRow {
  return {
    participant_id,
    display_name,
    exercise_slug,
    exercise_type: 'checkbox',
    response_json,
    is_complete: response_json != null,
    updated_at: '2026-07-15T00:00:00Z',
  }
}

const VALUE_LABELS = new Map([
  ['v_growth', 'Growth: keep learning'],
  ['v_family', 'Family'],
  ['v_security', 'Security'],
])

describe('deriveTeamProfiles', () => {
  it('resolves DISC, top attitude, and top values per participant', () => {
    const rows: LiveResponseRow[] = [
      // Alice → Extroverted + Task = D; attitude top = social; values Growth, Family
      row('p1', 'Alice Adams', 'core-style-q1-extroversion', { selected_ids: ['q1_extroverted'] }),
      row('p1', 'Alice Adams', 'core-style-q2-orientation', { selected_ids: ['q2_task'] }),
      row('p1', 'Alice Adams', 'identifying-attitudes', { selected_ids: ['s_1', 's_2', 'w_9'] }),
      row('p1', 'Alice Adams', 'top-three-values', { order: ['v_growth', 'v_family'] }),
    ]
    const profiles = deriveTeamProfiles(rows, VALUE_LABELS)
    expect(profiles).toHaveLength(1)
    const p = profiles[0]
    expect(p.disc).toEqual({ letter: 'D', name: 'Dominance' })
    expect(p.attitude).toBe('s')
    expect(p.topValues).toEqual(['Growth', 'Family']) // label before ':' , trimmed
  })

  it('returns null facets when the source answers are missing', () => {
    const rows = [row('p2', 'Bob Barr', 'core-style-q1-extroversion', { selected_ids: ['q1_introverted'] })]
    const [p] = deriveTeamProfiles(rows, VALUE_LABELS)
    expect(p.disc).toBeNull() // q2 missing
    expect(p.attitude).toBeNull()
    expect(p.topValues).toEqual([])
  })

  it('sorts profiles by display name and caps top values at three', () => {
    const rows: LiveResponseRow[] = [
      row('p2', 'Zed', 'top-three-values', { order: ['v_growth', 'v_family', 'v_security', 'v_growth'] }),
      row('p1', 'Ann', 'top-three-values', { order: [] }),
    ]
    const profiles = deriveTeamProfiles(rows, VALUE_LABELS)
    expect(profiles.map((p) => p.name)).toEqual(['Ann', 'Zed'])
    expect(profiles[1].topValues).toHaveLength(3)
  })
})
