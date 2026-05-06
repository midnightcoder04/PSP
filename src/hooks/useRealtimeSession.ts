import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface UseRealtimeSessionOptions {
  sessionId: string
  onUpdate: () => void
  enabled?: boolean
}

export function useRealtimeSession({ sessionId, onUpdate, enabled = true }: UseRealtimeSessionOptions) {
  const stableOnUpdate = useCallback(onUpdate, [onUpdate])

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel(`session:${sessionId}:progress`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'progress',
          filter: `session_id=eq.${sessionId}`,
        },
        () => stableOnUpdate()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, stableOnUpdate, enabled])
}
