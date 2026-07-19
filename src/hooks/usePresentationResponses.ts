import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database'

export interface LiveResponseRow {
  participant_id: string
  display_name: string
  exercise_slug: string
  exercise_type: string
  response_json: Json | null
  is_complete: boolean
  updated_at: string | null
}

interface UsePresentationResponsesOptions {
  sessionId: string
  exerciseSlugs: string[]
  enabled?: boolean
}

/**
 * Live participant responses for the presenter's responses panel.
 *
 * Fetches via the presenter-gated get_session_live_responses RPC and refreshes
 * (400ms debounced) on realtime changes to `responses` and this session's
 * `enrollments`. The responses subscription is deliberately unfiltered:
 * participant saves carry session_id = NULL, so a session filter would never
 * match — RLS scopes which events reach this client, and payloads are used
 * only as refetch triggers.
 */
export function usePresentationResponses({
  sessionId,
  exerciseSlugs,
  enabled = true,
}: UsePresentationResponsesOptions) {
  const [rows, setRows] = useState<LiveResponseRow[]>([])
  const [loading, setLoading] = useState(true)

  const slugsKey = exerciseSlugs.join(',')
  const slugs = useMemo(() => (slugsKey === '' ? [] : slugsKey.split(',')), [slugsKey])

  const refresh = useCallback(async () => {
    if (!enabled || slugs.length === 0) return
    const { data, error } = await supabase.rpc('get_session_live_responses', {
      p_session_id: sessionId,
      p_exercise_slugs: slugs,
    })
    if (!error) setRows((data ?? []) as LiveResponseRow[])
  }, [sessionId, slugs, enabled])

  useEffect(() => {
    if (!enabled || slugs.length === 0) {
      setRows([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    refresh().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [refresh, enabled, slugs])

  useEffect(() => {
    if (!enabled || slugs.length === 0) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => refresh(), 400)
    }

    const channel = supabase
      .channel(`present:${sessionId}:responses`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'responses' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrollments', filter: `session_id=eq.${sessionId}` },
        scheduleRefresh
      )
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [sessionId, enabled, slugs.length, refresh])

  return { rows, loading, refresh }
}
