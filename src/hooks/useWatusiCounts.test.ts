import { describe, it, expect } from 'vitest'
import {
  deriveWatusiCounts,
  watusiOrderFromCounts,
  WATUSI_TIEBREAK_ORDER,
} from './useWatusiCounts'

describe('deriveWatusiCounts', () => {
  it('returns all zeros for empty checked list', () => {
    expect(deriveWatusiCounts([])).toEqual({ w: 0, a: 0, t: 0, u: 0, s: 0, i: 0 })
  })

  it('counts items by id prefix', () => {
    const checked = ['w_1', 'w_2', 'w_7', 'a_11', 's_36', 's_42', 's_38']
    expect(deriveWatusiCounts(checked)).toEqual({ w: 3, a: 1, t: 0, u: 0, s: 3, i: 0 })
  })

  it('ignores ids with unknown prefixes', () => {
    expect(deriveWatusiCounts(['z_1', 'w_2'])).toEqual({ w: 1, a: 0, t: 0, u: 0, s: 0, i: 0 })
  })

  it('ignores ids without an underscore', () => {
    expect(deriveWatusiCounts(['w', 'attitude_w'])).toEqual({
      w: 0,
      a: 0,
      t: 0,
      u: 0,
      s: 0,
      i: 0,
    })
  })
})

describe('watusiOrderFromCounts', () => {
  it('sorts by count descending', () => {
    const counts = { w: 7, a: 0, t: 0, u: 0, s: 3, i: 0 }
    expect(watusiOrderFromCounts(counts)).toEqual([
      'attitude_w',
      'attitude_s',
      'attitude_a',
      'attitude_t',
      'attitude_u',
      'attitude_i',
    ])
  })

  it('breaks ties using canonical WATUSI order', () => {
    const counts = { w: 0, a: 0, t: 0, u: 0, s: 0, i: 0 }
    expect(watusiOrderFromCounts(counts)).toEqual(
      WATUSI_TIEBREAK_ORDER.map((g) => `attitude_${g}`)
    )
  })
})
