import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePresentationResponses } from './usePresentationResponses'

let capturedHandler: (() => void) | null = null

const mockSubscribe = vi.fn().mockReturnThis()
const mockOn = vi.fn()
const mockChannel = vi.fn()
const mockRemoveChannel = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}))

const sampleRow = {
  participant_id: 'p1',
  display_name: 'Alice Smith',
  exercise_slug: 'life-line-exercise',
  exercise_type: 'text',
  response_json: { value: 'hello' },
  is_complete: true,
  updated_at: '2026-07-10T00:00:00Z',
}

describe('usePresentationResponses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedHandler = null

    const chainable = {
      on: mockOn,
      subscribe: mockSubscribe,
    }
    mockOn.mockImplementation((_event: unknown, _filter: unknown, handler?: () => void) => {
      if (handler) capturedHandler = handler
      return chainable
    })
    mockChannel.mockImplementation(() => chainable)
    mockRpc.mockResolvedValue({ data: [sampleRow], error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fetches rows through the presenter RPC', async () => {
    const { result } = renderHook(() =>
      usePresentationResponses({ sessionId: 'sess-1', exerciseSlugs: ['life-line-exercise'] })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockRpc).toHaveBeenCalledWith('get_session_live_responses', {
      p_session_id: 'sess-1',
      p_exercise_slugs: ['life-line-exercise'],
    })
    expect(result.current.rows).toEqual([sampleRow])
  })

  it('subscribes to unfiltered responses changes and session-filtered enrollments', async () => {
    renderHook(() =>
      usePresentationResponses({ sessionId: 'sess-1', exerciseSlugs: ['life-line-exercise'] })
    )

    await waitFor(() => expect(mockSubscribe).toHaveBeenCalled())

    expect(mockChannel).toHaveBeenCalledWith('present:sess-1:responses')
    // responses: no session filter — participant saves carry session_id = NULL
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'responses' }),
      expect.any(Function)
    )
    const responsesCall = mockOn.mock.calls.find(
      (c) => (c[1] as { table: string }).table === 'responses'
    )
    expect((responsesCall![1] as { filter?: string }).filter).toBeUndefined()

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'enrollments', filter: 'session_id=eq.sess-1' }),
      expect.any(Function)
    )
  })

  it('debounces realtime events into a single refetch', async () => {
    const { result } = renderHook(() =>
      usePresentationResponses({ sessionId: 'sess-1', exerciseSlugs: ['life-line-exercise'] })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockRpc).toHaveBeenCalledTimes(1)

    vi.useFakeTimers()
    act(() => {
      capturedHandler!()
      capturedHandler!()
      capturedHandler!()
    })
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    vi.useRealTimers()

    await waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(2))
  })

  it('does nothing when no exercise slugs are linked', () => {
    const { result } = renderHook(() =>
      usePresentationResponses({ sessionId: 'sess-1', exerciseSlugs: [] })
    )

    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockChannel).not.toHaveBeenCalled()
    expect(result.current.rows).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('removes the channel on unmount', async () => {
    const { unmount } = renderHook(() =>
      usePresentationResponses({ sessionId: 'sess-1', exerciseSlugs: ['life-line-exercise'] })
    )
    await waitFor(() => expect(mockSubscribe).toHaveBeenCalled())

    unmount()
    expect(mockRemoveChannel).toHaveBeenCalled()
  })
})
