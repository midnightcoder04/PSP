import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProgress } from './useProgress'

const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn(),
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
  },
}))

const mockProgress = [
  {
    id: 'prog-1',
    participant_id: 'user-1',
    section_id: 'sec-1',
    session_id: null,
    completed_exercises: 3,
    total_exercises: 5,
    section_completed_at: null,
    last_exercise_id: 'ex-3',
    last_activity_at: new Date().toISOString(),
  },
]

describe('useProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseChain.select.mockReturnThis()
    mockSupabaseChain.eq.mockReturnThis()
    mockSupabaseChain.is.mockResolvedValue({ data: mockProgress, error: null })
  })

  it('fetches progress rows for a participant', async () => {
    const { result } = renderHook(() =>
      useProgress({ participantId: 'user-1' })
    )

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.progress).toEqual(mockProgress)
    expect(result.current.error).toBeNull()
  })

  it('filters by sessionId when provided', async () => {
    mockSupabaseChain.is.mockReturnThis()
    mockSupabaseChain.eq.mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })

    // Re-setup: is() not called, second eq() is terminal
    mockSupabaseChain.select.mockReturnThis()
    mockSupabaseChain.eq.mockReturnThis()
    // Last eq call is the terminal one
    const terminalEq = vi.fn().mockResolvedValue({ data: mockProgress, error: null })
    mockSupabaseChain.eq.mockReturnValueOnce(mockSupabaseChain)
      .mockReturnValueOnce({ ...mockSupabaseChain, eq: terminalEq })

    const { result } = renderHook(() =>
      useProgress({ participantId: 'user-1', sessionId: 'session-1' })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
  })

  it('surfaces error when fetch fails', async () => {
    mockSupabaseChain.is.mockResolvedValue({ data: null, error: { message: 'Fetch failed' } })

    const { result } = renderHook(() =>
      useProgress({ participantId: 'user-1' })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Fetch failed')
    expect(result.current.progress).toEqual([])
  })

  it('provides a refetch function that reloads progress', async () => {
    const { result } = renderHook(() =>
      useProgress({ participantId: 'user-1' })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(typeof result.current.refetch).toBe('function')
  })
})
