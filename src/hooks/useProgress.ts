import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Progress } from '@/types/database'

interface UseProgressOptions {
  participantId: string
  sessionId?: string | null
}

interface UseProgressResult {
  progress: Progress[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProgress({ participantId, sessionId }: UseProgressOptions): UseProgressResult {
  const [progress, setProgress] = useState<Progress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('progress')
      .select('id, participant_id, section_id, session_id, completed_exercises, total_exercises, section_completed_at, last_exercise_id, last_activity_at')
      .eq('participant_id', participantId)

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    } else {
      query = query.is('session_id', null)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setProgress(data ?? [])
    }
    setLoading(false)
  }, [participantId, sessionId])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { progress, loading, error, refetch: fetch }
}
