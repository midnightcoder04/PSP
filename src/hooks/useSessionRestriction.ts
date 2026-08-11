import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { resolveActiveSessionId } from '@/lib/resolveActiveSession'

export interface SessionRestriction {
  sessionId: string | null
  restrictToValues: boolean
  loading: boolean
}

const INITIAL: SessionRestriction = { sessionId: null, restrictToValues: false, loading: true }

/**
 * Resolves the participant's active session (best-effort, via the most
 * recent active enrollment) and whether that session's content is
 * restricted to end after Values. Unenrolled/self-directed participants
 * resolve to `{ sessionId: null, restrictToValues: false }` — unrestricted.
 */
export function useSessionRestriction(participantId: string | undefined): SessionRestriction {
  const [state, setState] = useState<SessionRestriction>(INITIAL)

  useEffect(() => {
    if (!participantId) {
      setState({ sessionId: null, restrictToValues: false, loading: false })
      return
    }

    let cancelled = false

    async function load() {
      const sid = await resolveActiveSessionId(participantId!)
      if (!sid) {
        if (!cancelled) setState({ sessionId: null, restrictToValues: false, loading: false })
        return
      }
      try {
        const { data } = await supabase
          .from('sessions')
          .select('restrict_to_values')
          .eq('id', sid)
          .maybeSingle()
        if (!cancelled) {
          setState({ sessionId: sid, restrictToValues: data?.restrict_to_values ?? false, loading: false })
        }
      } catch {
        if (!cancelled) setState({ sessionId: sid, restrictToValues: false, loading: false })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [participantId])

  return state
}
