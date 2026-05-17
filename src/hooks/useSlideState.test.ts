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

  // ── 005-iter5-ux-fixes / US3 — resetKey semantics ────────────────────
  // Per contracts/slide-state.md §Test matrix (T5, T6, T7).

  it('T5: re-derives initialSlide when resetKey changes mid-test (Personality→Attitude hand-off)', () => {
    const personalityGroups = [[ex('p1', 0, 0)], [ex('p2', 1, 1)], [ex('p3', 2, 2)], [ex('p4', 3, 3)]]
    const attitudeGroups = [[ex('a1', 0, 0)], [ex('a2', 1, 1)], [ex('a3', 2, 2)]]
    const { result, rerender } = renderHook(
      ({ slideGroups, resetKey }: { slideGroups: Exercise[][]; resetKey: string }) =>
        useSlideState({
          intro: true,
          slideGroups,
          responses: {},
          resumeExerciseId: null,
          resetKey,
        }),
      { initialProps: { slideGroups: personalityGroups, resetKey: 'personality' } }
    )
    expect(result.current.currentSlide).toBe(-1)
    // Advance to the closing slide on Personality
    act(() => result.current.goNext()) // -1 → 0
    expect(result.current.canGoNext).toBe(false) // p1 not complete; can't advance further

    // Now navigate to Attitude (different slug + different data shape)
    rerender({ slideGroups: attitudeGroups, resetKey: 'attitude' })
    // MUST land on Attitude intro (-1), NOT carry over Personality's currentSlide=0
    expect(result.current.currentSlide).toBe(-1)
    expect(result.current.isAtIntro).toBe(true)
  })

  it('T6: does NOT reset when resetKey changes but slideGroups is empty (data not ready yet)', () => {
    const { result, rerender } = renderHook(
      ({ slideGroups, resetKey }: { slideGroups: Exercise[][]; resetKey: string }) =>
        useSlideState({
          intro: true,
          slideGroups,
          responses: {},
          resumeExerciseId: null,
          resetKey,
        }),
      { initialProps: { slideGroups: groups, resetKey: 'first' } }
    )
    // Advance off intro so we can observe whether a reset happens
    act(() => result.current.goNext())
    expect(result.current.currentSlide).toBe(0)

    // Rerender with empty slideGroups + new resetKey — must NOT reset
    rerender({ slideGroups: [], resetKey: 'second' })
    expect(result.current.currentSlide).toBe(0)
  })

  it('T7: after advancing to closing, a resetKey change re-derives to intro (not preserved as closing)', () => {
    const initial = [[ex('x', 0, 0)]]
    const next = [[ex('y', 0, 0)], [ex('z', 1, 1)]]
    const responses: Record<string, Response> = { x: resp('x', true) } // initial is allDone → starts at closing
    const { result, rerender } = renderHook(
      ({ slideGroups, resetKey, responses }: { slideGroups: Exercise[][]; resetKey: string; responses: Record<string, Response> }) =>
        useSlideState({
          intro: true,
          slideGroups,
          responses,
          resumeExerciseId: null,
          resetKey,
        }),
      { initialProps: { slideGroups: initial, resetKey: 'first', responses } }
    )
    expect(result.current.currentSlide).toBe(1) // closing on 1-group section
    expect(result.current.isAtClosing).toBe(true)

    // Section change to a section that is NOT allDone — must derive to intro
    rerender({ slideGroups: next, resetKey: 'second', responses: {} })
    expect(result.current.currentSlide).toBe(-1)
    expect(result.current.isAtIntro).toBe(true)
  })

  // ── 006-iter6 / US3 (T042a) — narrow optional-checkbox rule ──────────────
  // Per FR-013 (U1 resolution): a checkbox whose content_json.computed ===
  // 'core_style_options' is treated as always-complete. Other checkboxes
  // (including those with is_scored=false) retain the standard contract.

  function exCheckbox(id: string, computed: string | undefined, slideGroup = 0): Exercise {
    return {
      id,
      section_id: 'sec-1',
      slug: `ex-${id}`,
      title: `Exercise ${id}`,
      type: 'checkbox',
      content_json: computed ? { prompt: 'p', options: [], computed } : { prompt: 'p', options: [] },
      order_index: 0,
      slide_group: slideGroup,
      is_scored: false,
      attribution: null,
    }
  }

  it("T042a-1: checkbox with computed='core_style_options' is always complete (no response needed)", () => {
    const optionalCheckbox = exCheckbox('opt', 'core_style_options')
    const sg = [[optionalCheckbox]]
    const { result } = renderHook(() =>
      useSlideState({ intro: false, slideGroups: sg, responses: {}, resumeExerciseId: 'opt' })
    )
    expect(result.current.canGoNext).toBe(true)
  })

  it('T042a-2: checkbox without that computed flag still requires a complete response', () => {
    const plainCheckbox = exCheckbox('plain', undefined)
    const sg = [[plainCheckbox]]
    const { result: r1 } = renderHook(() =>
      useSlideState({ intro: false, slideGroups: sg, responses: {}, resumeExerciseId: 'plain' })
    )
    expect(r1.current.canGoNext).toBe(false)
    const { result: r2 } = renderHook(() =>
      useSlideState({ intro: false, slideGroups: sg, responses: { plain: resp('plain', true) }, resumeExerciseId: 'plain' })
    )
    expect(r2.current.canGoNext).toBe(true)
  })

  it('T042a-3: checkbox with computed=some-other-value is NOT auto-complete', () => {
    const otherCheckbox = exCheckbox('other', 'some_other_computed')
    const sg = [[otherCheckbox]]
    const { result } = renderHook(() =>
      useSlideState({ intro: false, slideGroups: sg, responses: {}, resumeExerciseId: 'other' })
    )
    expect(result.current.canGoNext).toBe(false)
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
