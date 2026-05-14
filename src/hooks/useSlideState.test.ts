import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSlideState } from './useSlideState'
import type { Exercise, Response } from '@/types/database'

function ex(id: string, slideGroup: number | null = null, order = 0, type: Exercise['type'] = 'text'): Exercise {
  return {
    id,
    section_id: 'sec-1',
    slug: `ex-${id}`,
    title: `Exercise ${id}`,
    type,
    content_json: { prompt: '' },
    order_index: order,
    slide_group: slideGroup,
    is_scored: false,
    attribution: null,
  }
}

function resp(exerciseId: string, isComplete: boolean): Response {
  return {
    id: `resp-${exerciseId}`,
    participant_id: 'p1',
    exercise_id: exerciseId,
    session_id: null,
    response_json: { v: true },
    is_complete: isComplete,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('useSlideState', () => {
  const groups = [[ex('a', 0, 0)], [ex('b', 1, 1)], [ex('c', 2, 2)]]

  it('starts at intro (-1) when no resumeExerciseId and intro=true', () => {
    const { result } = renderHook(() =>
      useSlideState({ intro: true, slideGroups: groups, responses: {}, resumeExerciseId: null })
    )
    expect(result.current.currentSlide).toBe(-1)
    expect(result.current.isAtIntro).toBe(true)
  })

  it('starts at the slide containing resumeExerciseId', () => {
    const { result } = renderHook(() =>
      useSlideState({ intro: true, slideGroups: groups, responses: {}, resumeExerciseId: 'b' })
    )
    expect(result.current.currentSlide).toBe(1)
  })

  it('starts at closing (N) when every exercise is complete', () => {
    const responses = { a: resp('a', true), b: resp('b', true), c: resp('c', true) }
    const { result } = renderHook(() =>
      useSlideState({ intro: true, slideGroups: groups, responses, resumeExerciseId: null })
    )
    expect(result.current.currentSlide).toBe(3) // N = 3 groups → closing index = 3
    expect(result.current.isAtClosing).toBe(true)
  })

  it('canGoPrev is false on intro, true otherwise', () => {
    const { result } = renderHook(() =>
      useSlideState({ intro: true, slideGroups: groups, responses: {}, resumeExerciseId: null })
    )
    expect(result.current.canGoPrev).toBe(false)
    act(() => result.current.goNext())
    expect(result.current.canGoPrev).toBe(true)
  })

  it('canGoNext is true on intro', () => {
    const { result } = renderHook(() =>
      useSlideState({ intro: true, slideGroups: groups, responses: {}, resumeExerciseId: null })
    )
    expect(result.current.canGoNext).toBe(true)
  })

  it('canGoNext is false on an exercise slide when not complete', () => {
    const { result } = renderHook(() =>
      useSlideState({ intro: true, slideGroups: groups, responses: {}, resumeExerciseId: 'a' })
    )
    expect(result.current.currentSlide).toBe(0)
    expect(result.current.canGoNext).toBe(false)
  })

  it('canGoNext is true when current group exercise is complete', () => {
    const responses = { a: resp('a', true) }
    const { result } = renderHook(() =>
      useSlideState({ intro: true, slideGroups: groups, responses, resumeExerciseId: 'a' })
    )
    expect(result.current.canGoNext).toBe(true)
  })

  it('treats info exercises as always complete for gating', () => {
    const infoGroups = [[ex('info1', 0, 0, 'info')]]
    const { result } = renderHook(() =>
      useSlideState({ intro: true, slideGroups: infoGroups, responses: {}, resumeExerciseId: 'info1' })
    )
    expect(result.current.canGoNext).toBe(true)
  })

  it('goNext advances when canGoNext is true', () => {
    const { result } = renderHook(() =>
      useSlideState({ intro: true, slideGroups: groups, responses: {}, resumeExerciseId: null })
    )
    expect(result.current.currentSlide).toBe(-1)
    act(() => result.current.goNext())
    expect(result.current.currentSlide).toBe(0)
  })

  it('goNext is a no-op when canGoNext is false', () => {
    const { result } = renderHook(() =>
      useSlideState({ intro: true, slideGroups: groups, responses: {}, resumeExerciseId: 'a' })
    )
    expect(result.current.currentSlide).toBe(0)
    act(() => result.current.goNext())
    expect(result.current.currentSlide).toBe(0)
  })

  it('goPrev moves back; never goes below -1', () => {
    const { result } = renderHook(() =>
      useSlideState({ intro: true, slideGroups: groups, responses: {}, resumeExerciseId: 'b' })
    )
    expect(result.current.currentSlide).toBe(1)
    act(() => result.current.goPrev())
    expect(result.current.currentSlide).toBe(0)
    act(() => result.current.goPrev())
    expect(result.current.currentSlide).toBe(-1)
    act(() => result.current.goPrev())
    expect(result.current.currentSlide).toBe(-1)
  })

  it('groups exercises with the same slide_group together for gating', () => {
    // Two exercises in slide_group=0; gating requires both complete.
    const linkedGroups = [[ex('a', 0, 0), ex('b', 0, 1)], [ex('c', 1, 2)]]
    const partial = { a: resp('a', true) }
    const { result: partialResult } = renderHook(() =>
      useSlideState({
        intro: true,
        slideGroups: linkedGroups,
        responses: partial,
        resumeExerciseId: 'a',
      })
    )
    expect(partialResult.current.canGoNext).toBe(false)

    const full = { a: resp('a', true), b: resp('b', true) }
    const { result: fullResult } = renderHook(() =>
      useSlideState({
        intro: true,
        slideGroups: linkedGroups,
        responses: full,
        resumeExerciseId: 'a',
      })
    )
    expect(fullResult.current.canGoNext).toBe(true)
  })
})
