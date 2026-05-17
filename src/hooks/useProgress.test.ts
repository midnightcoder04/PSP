import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProgress } from './useProgress'

// Builds a Supabase-like query chain that resolves with the given data/error.
// Every chain method returns `this`; the object itself is a thenable so
// `await chain` (or `await chain.eq(...)`) resolves with { data, error }.
function makeChain<T>(data: T | null, error: { message: string } | null = null) {
  const result = { data, error }
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    then: (onFulfilled: (v: typeof result) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
  }
  return chain
}

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

// supabase.from(...) is mocked per-test; assigning to this ref lets each
// test choose what data the chain resolves with.
let currentChain: ReturnType<typeof makeChain> = makeChain(mockProgress)

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => currentChain),
  },
}))

describe('useProgress', () => {
  beforeEach(() => {
    currentChain = makeChain(mockProgress)
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
    currentChain = makeChain(mockProgress)

    const { result } = renderHook(() =>
      useProgress({ participantId: 'user-1', sessionId: 'session-1' })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.progress).toEqual(mockProgress)
    // When sessionId is provided, the hook calls .eq('session_id', ...)
    // instead of .is('session_id', null). Verify is() was NOT called.
    expect(currentChain.is).not.toHaveBeenCalled()
    expect(currentChain.eq).toHaveBeenCalledWith('session_id', 'session-1')
  })

  it('surfaces error when fetch fails', async () => {
    currentChain = makeChain(null, { message: 'Fetch failed' })

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

  it('deduplicates progress rows by section_id, keeping the most recent', async () => {
    // Belt-and-suspenders client guard against legacy duplicate rows from
    // before migration 013. The new NULLS NOT DISTINCT index prevents fresh
    // duplicates, but a teammate's local DB or stale snapshot might still
    // return them — the hook must collapse them deterministically.
    const older = '2026-05-01T00:00:00.000Z'
    const newer = '2026-05-10T00:00:00.000Z'
    currentChain = makeChain([
      {
        id: 'prog-old',
        participant_id: 'user-1',
        section_id: 'sec-1',
        session_id: null,
        completed_exercises: 1,
        total_exercises: 3,
        section_completed_at: null,
        last_exercise_id: 'ex-1',
        last_activity_at: older,
      },
      {
        id: 'prog-new',
        participant_id: 'user-1',
        section_id: 'sec-1',
        session_id: null,
        completed_exercises: 3,
        total_exercises: 3,
        section_completed_at: newer,
        last_exercise_id: 'ex-3',
        last_activity_at: newer,
      },
    ])

    const { result } = renderHook(() => useProgress({ participantId: 'user-1' }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.progress).toHaveLength(1)
    expect(result.current.progress[0].id).toBe('prog-new')
    expect(result.current.progress[0].section_completed_at).toBe(newer)
  })
})
