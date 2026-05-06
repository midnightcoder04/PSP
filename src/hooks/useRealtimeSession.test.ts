import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRealtimeSession } from './useRealtimeSession'

let capturedHandler: (() => void) | null = null

const mockSubscribe = vi.fn().mockReturnThis()
const mockOn = vi.fn().mockImplementation((_event, _filter, handler) => {
  capturedHandler = handler
  return { subscribe: mockSubscribe }
})
const mockChannel = vi.fn().mockImplementation(() => ({ on: mockOn, subscribe: mockSubscribe }))
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
    mockOn.mockImplementation((_event: unknown, _filter: unknown, handler: () => void) => {
      capturedHandler = handler
      return { subscribe: mockSubscribe }
    })
    mockChannel.mockImplementation(() => ({ on: mockOn, subscribe: mockSubscribe }))
  })

  it('subscribes to the progress channel for the given session', () => {
    const onUpdate = vi.fn()
    renderHook(() =>
      useRealtimeSession({ sessionId: 'session-123', onUpdate })
    )

    expect(mockChannel).toHaveBeenCalledWith('session:session-123:progress')
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
