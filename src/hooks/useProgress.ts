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
      // Belt-and-suspenders dedup. Migration 013 added a NULLS NOT DISTINCT
      // unique index that prevents fresh duplicates, but legacy snapshots and
      // un-migrated local DBs can still surface them. Collapse to one row per
      // section_id, keeping the most recent by last_activity_at.
      const dedup = new Map<string, Progress>()
      for (const p of data ?? []) {
        const existing = dedup.get(p.section_id)
        if (!existing || (p.last_activity_at ?? '') > (existing.last_activity_at ?? '')) {
          dedup.set(p.section_id, p)
        }
      }
      setProgress(Array.from(dedup.values()))
    }
    setLoading(false)
  }, [participantId, sessionId])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { progress, loading, error, refetch: fetch }
}
