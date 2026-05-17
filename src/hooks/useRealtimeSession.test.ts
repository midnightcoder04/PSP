import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRealtimeSession } from './useRealtimeSession'

let capturedHandler: (() => void) | null = null

const mockSubscribe = vi.fn().mockReturnThis()

// on() must return an object with both .on() and .subscribe() so the hook can
// chain two .on() calls (progress + enrollments) before calling .subscribe().
const mockOn = vi.fn()
const mockChannel = vi.fn()
const mockRemoveChannel = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}))

describe('useRealtimeSession', () => {
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
  })

  it('subscribes to the activity channel for the given session', () => {
    const onUpdate = vi.fn()
    renderHook(() =>
      useRealtimeSession({ sessionId: 'session-123', onUpdate })
    )

    expect(mockChannel).toHaveBeenCalledWith('session:session-123:activity')
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'progress',
        filter: 'session_id=eq.session-123',
      }),
      expect.any(Function)
    )
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('calls onUpdate when a postgres_changes event fires', () => {
    const onUpdate = vi.fn()
    renderHook(() =>
      useRealtimeSession({ sessionId: 'session-123', onUpdate })
    )

    expect(capturedHandler).not.toBeNull()
    capturedHandler!()
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('removes the channel on unmount', () => {
    const onUpdate = vi.fn()
    const { unmount } = renderHook(() =>
      useRealtimeSession({ sessionId: 'session-123', onUpdate })
    )

    unmount()
    expect(mockRemoveChannel).toHaveBeenCalled()
  })

  it('does not subscribe when enabled is false', () => {
    const onUpdate = vi.fn()
    renderHook(() =>
      useRealtimeSession({ sessionId: 'session-123', onUpdate, enabled: false })
    )

    expect(mockChannel).not.toHaveBeenCalled()
    expect(mockSubscribe).not.toHaveBeenCalled()
  })
})
