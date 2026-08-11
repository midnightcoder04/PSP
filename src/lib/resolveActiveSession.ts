import { supabase } from '@/lib/supabase'

/**
 * Best-effort resolution of "the session this participant is currently in":
 * their most recent active enrollment. Returns null for self-directed
 * participants with no active enrollment — callers should degrade gracefully
 * (e.g. treat as unrestricted / session-agnostic) rather than error.
 *
 * Extracted from the lookup originally inlined in TestimonialModal so
 * useSessionRestriction can share the exact same resolution logic.
 */
export async function resolveActiveSessionId(participantId: string): Promise<string | null> {
  try {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('session_id')
      .eq('participant_id', participantId)
      .eq('is_active', true)
      .order('enrolled_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return enrollment?.session_id ?? null
  } catch {
    // Best-effort lookup — degrade to "no active session" on any failure
    // rather than surfacing an error to session-agnostic callers.
    return null
  }
}
