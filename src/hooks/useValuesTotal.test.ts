import { describe, it, expect } from 'vitest'
import { sumCurrencyColumn } from './useValuesTotal'

describe('sumCurrencyColumn', () => {
  it('returns 0 for empty input', () => {
    expect(sumCurrencyColumn([], 0)).toBe(0)
  })

  it('sums numeric strings in the given column', () => {
    expect(
      sumCurrencyColumn(
        [
          ['5000', 'Family'],
          ['10000', 'Health'],
          ['85000', 'Work'],
        ],
        0
      )
    ).toBe(100000)
  })

  it('ignores non-numeric cells', () => {
    expect(sumCurrencyColumn([['abc', 'X'], ['10', 'Y']], 0)).toBe(10)
  })

  it('handles decimal values', () => {
    expect(sumCurrencyColumn([['10.5', 'A'], ['20.25', 'B']], 0)).toBe(30.75)
  })

  it('handles whitespace and commas', () => {
    expect(sumCurrencyColumn([[' 1,000 ', 'A'], ['2,500', 'B']], 0)).toBe(3500)
  })

  it('treats empty cells as 0', () => {
    expect(sumCurrencyColumn([['', 'A'], ['5000', 'B']], 0)).toBe(5000)
  })
})
