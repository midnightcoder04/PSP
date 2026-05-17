import { describe, it, expect } from 'vitest'
import { isStructuredTextComplete, isRatingPickerComplete } from './exerciseCompletion'
import type { StructuredTextContent, RatingPickerContent } from '@/types/database'

const stContent: StructuredTextContent = {
  prompt: '',
  questions: [
    { id: 'q1', label: 'q1', min_length: 1 },
    { id: 'q2', label: 'q2', min_length: 5 },
    { id: 'q3', label: 'q3' }, // defaults to 1
  ],
}

describe('isStructuredTextComplete', () => {
  it('returns false for null response', () => {
    expect(isStructuredTextComplete(stContent, null)).toBe(false)
  })

  it('returns false when any required question is empty', () => {
    expect(
      isStructuredTextComplete(stContent, { answers: { q1: 'a', q2: '12345' } })
    ).toBe(false)
  })

  it('returns false when min_length not met', () => {
    expect(
      isStructuredTextComplete(stContent, { answers: { q1: 'a', q2: '1234', q3: 'x' } })
    ).toBe(false)
  })

  it('returns true when all questions meet min_length', () => {
    expect(
      isStructuredTextComplete(stContent, { answers: { q1: 'a', q2: '12345', q3: 'x' } })
    ).toBe(true)
  })

  it('trims whitespace when measuring length', () => {
    expect(
      isStructuredTextComplete(stContent, { answers: { q1: '  ', q2: '12345', q3: 'x' } })
    ).toBe(false)
  })
})

const rpContent: RatingPickerContent = {
  prompt: '',
  scale: { min: 1, max: 5 },
  items: [
    { id: 's1', label: 'Skill 1' },
    { id: 's2', label: 'Skill 2' },
  ],
}

describe('isRatingPickerComplete', () => {
  it('returns false for null response', () => {
    expect(isRatingPickerComplete(rpContent, null)).toBe(false)
  })

  it('returns false when any item is missing a rating', () => {
    expect(isRatingPickerComplete(rpContent, { ratings: { s1: 4 } })).toBe(false)
  })

  it('returns false when a rating is out of scale', () => {
    expect(
      isRatingPickerComplete(rpContent, { ratings: { s1: 4, s2: 7 } })
    ).toBe(false)
  })

  it('returns true when every item has an in-range rating', () => {
    expect(
      isRatingPickerComplete(rpContent, { ratings: { s1: 4, s2: 1 } })
    ).toBe(true)
  })
})
