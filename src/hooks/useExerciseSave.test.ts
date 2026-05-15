import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExerciseSave } from './useExerciseSave'

const mockUpsert = vi.fn().mockResolvedValue({ error: null })

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ upsert: mockUpsert })),
  },
}))

describe('useExerciseSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with idle status', () => {
    const { result } = renderHook(() =>
      useExerciseSave({ exerciseId: 'ex-1', participantId: 'user-1' })
    )
    expect(result.current.status).toBe('idle')
  })

  it('does not call upsert before debounce delay', () => {
    const { result } = renderHook(() =>
      useExerciseSave({ exerciseId: 'ex-1', participantId: 'user-1', debounceMs: 300 })
    )

    act(() => {
      result.current.save({ value: 'hello' }, false)
    })

    vi.advanceTimersByTime(200)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('calls supabase upsert after 300ms debounce', async () => {
    const { result } = renderHook(() =>
      useExerciseSave({ exerciseId: 'ex-1', participantId: 'user-1', debounceMs: 300 })
    )

    act(() => {
      result.current.save({ value: 'hello' }, true)
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        participant_id: 'user-1',
        exercise_id: 'ex-1',
        response_json: { value: 'hello' },
        is_complete: true,
      }),
      expect.objectContaining({ onConflict: 'participant_id,exercise_id,session_id' })
    )
  })

  it('debounces rapid saves — only calls upsert once', async () => {
    const { result } = renderHook(() =>
      useExerciseSave({ exerciseId: 'ex-1', participantId: 'user-1', debounceMs: 300 })
    )

    act(() => {
      result.current.save({ value: 'a' })
      result.current.save({ value: 'ab' })
      result.current.save({ value: 'abc' })
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(mockUpsert).toHaveBeenCalledTimes(1)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ response_json: { value: 'abc' } }),
      expect.anything()
    )
  })

  it('saveImmediate calls upsert without debounce', async () => {
    const { result } = renderHook(() =>
      useExerciseSave({ exerciseId: 'ex-1', participantId: 'user-1' })
    )

    await act(async () => {
      await result.current.saveImmediate({ value: 'immediate' }, false)
    })

    expect(mockUpsert).toHaveBeenCalledTimes(1)
  })

  it('sets status to error when upsert fails', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } })

    const { result } = renderHook(() =>
      useExerciseSave({ exerciseId: 'ex-1', participantId: 'user-1' })
    )

    await act(async () => {
      await result.current.saveImmediate({ value: 'fail' })
    })

    expect(result.current.status).toBe('error')
  })

  it('transitions status to saved after successful save', async () => {
    const { result } = renderHook(() =>
      useExerciseSave({ exerciseId: 'ex-1', participantId: 'user-1' })
    )

    await act(async () => {
      await result.current.saveImmediate({ value: 'ok' })
    })

    expect(result.current.status).toBe('saved')
  })
})
