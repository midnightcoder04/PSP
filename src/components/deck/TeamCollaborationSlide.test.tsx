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

// Mirrors the real `what-do-i-value` ranking items: "Name — gloss (Items a + b)".
const VALUE_ITEMS = [
  { id: 'val_justice', label: 'Justice — Moral rightness, honor, fairness (Items 1 + 18)' },
  { id: 'val_wisdom', label: 'Wisdom — Understanding of what is true, right or lasting (Items 6 + 23)' },
  { id: 'val_autonomy', label: 'Autonomy — Independence, self-containment (Items 8 + 25)' },
  { id: 'val_economy', label: 'Economy — Abundance of material possessions, wealth (Items 9 + 26)' },
]

/** Values Shopping Spree rows: 2 * N rows of [#, item, amount]. */
function spreeRows(firstHalf: number[], secondHalf: number[]) {
  return [...firstHalf, ...secondHalf].map((amount, i) => [String(i + 1), 'item', String(amount)])
}

describe('deriveTeamProfiles', () => {
  it('resolves DISC, top attitudes, and top values per participant', () => {
    const rows: LiveResponseRow[] = [
      // Alice → Extroverted + Task = D; attitudes s(3) > w(2) > u(2) > a(1); values
      // from the `what-do-i-value` ranking order.
      row('p1', 'Alice Adams', 'core-style-q1-extroversion', { selected_ids: ['q1_extroverted'] }),
      row('p1', 'Alice Adams', 'core-style-q2-orientation', { selected_ids: ['q2_task'] }),
      row('p1', 'Alice Adams', 'identifying-attitudes', {
        selected_ids: ['s_1', 's_2', 's_3', 'w_9', 'w_4', 'u_2', 'u_5', 'a_1'],
      }),
      row('p1', 'Alice Adams', 'what-do-i-value', { order: ['val_justice', 'val_wisdom'] }),
    ]
    const profiles = deriveTeamProfiles(rows, VALUE_ITEMS)
    expect(profiles).toHaveLength(1)
    const p = profiles[0]
    expect(p.disc).toEqual({ letter: 'D', name: 'Dominance' })
    expect(p.topAttitudes).toEqual(['s', 'w', 'u']) // ranked by count, canonical tiebreak
    expect(p.topValues).toEqual(['Justice', 'Wisdom']) // name before the em dash
  })

  it('caps attitudes at three and breaks count ties in canonical WATUSI order', () => {
    const rows = [
      row('p1', 'Tie Breaker', 'identifying-attitudes', {
        selected_ids: ['i_1', 's_1', 'u_1', 't_1', 'a_1', 'w_1'],
      }),
    ]
    const [p] = deriveTeamProfiles(rows, VALUE_ITEMS)
    expect(p.topAttitudes).toEqual(['w', 'a', 't'])
  })

  it('reads the legacy `checked` attitude payload key', () => {
    const rows = [row('p1', 'Old Payload', 'identifying-attitudes', { checked: ['u_1', 'u_2', 's_1'] })]
    const [p] = deriveTeamProfiles(rows, VALUE_ITEMS)
    expect(p.topAttitudes).toEqual(['u', 's'])
  })

  it('falls back to the Values Shopping Spree pair sums when no ranking is saved', () => {
    // Pair sums: justice 0+0, wisdom 500+1500, autonomy 9000+0, economy 100+200.
    const rows = [
      row('p1', 'No Ranking Yet', 'values-shopping-spree', {
        rows: spreeRows([0, 500, 9000, 100], [0, 1500, 0, 200]),
      }),
    ]
    const [p] = deriveTeamProfiles(rows, VALUE_ITEMS)
    expect(p.topValues).toEqual(['Autonomy', 'Wisdom', 'Economy'])
  })

  it('prefers the saved ranking over the spree fallback', () => {
    const rows = [
      row('p1', 'Both', 'what-do-i-value', { order: ['val_justice', 'val_economy'] }),
      row('p1', 'Both', 'values-shopping-spree', {
        rows: spreeRows([0, 500, 9000, 100], [0, 1500, 0, 200]),
      }),
    ]
    const [p] = deriveTeamProfiles(rows, VALUE_ITEMS)
    expect(p.topValues).toEqual(['Justice', 'Economy'])
  })

  it('shows no values when the spree is present but entirely unspent', () => {
    const rows = [
      row('p1', 'Untouched', 'values-shopping-spree', {
        rows: spreeRows([0, 0, 0, 0], [0, 0, 0, 0]),
      }),
    ]
    const [p] = deriveTeamProfiles(rows, VALUE_ITEMS)
    expect(p.topValues).toEqual([])
  })

  it('returns empty facets when the source answers are missing', () => {
    const rows = [row('p2', 'Bob Barr', 'core-style-q1-extroversion', { selected_ids: ['q1_introverted'] })]
    const [p] = deriveTeamProfiles(rows, VALUE_ITEMS)
    expect(p.disc).toBeNull() // q2 missing
    expect(p.topAttitudes).toEqual([])
    expect(p.topValues).toEqual([])
  })

  it('sorts profiles by display name and caps top values at three', () => {
    const rows: LiveResponseRow[] = [
      row('p2', 'Zed', 'what-do-i-value', {
        order: ['val_justice', 'val_wisdom', 'val_autonomy', 'val_economy'],
      }),
      row('p1', 'Ann', 'what-do-i-value', { order: [] }),
    ]
    const profiles = deriveTeamProfiles(rows, VALUE_ITEMS)
    expect(profiles.map((p) => p.name)).toEqual(['Ann', 'Zed'])
    expect(profiles[1].topValues).toEqual(['Justice', 'Wisdom', 'Autonomy'])
  })
})
