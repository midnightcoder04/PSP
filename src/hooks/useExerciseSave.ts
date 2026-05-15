import { useState, useRef, useCallback, useContext, createContext } from 'react'
import { supabase } from '@/lib/supabase'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseExerciseSaveOptions {
  exerciseId: string
  participantId: string
  sessionId?: string | null
  debounceMs?: number
}

interface UseExerciseSaveResult {
  save: (responseJson: unknown, isComplete?: boolean) => void
  saveImmediate: (responseJson: unknown, isComplete?: boolean) => Promise<void>
  status: SaveStatus
}

/**
 * Optional context for synchronous local cache updates.
 *
 * SectionPage (or any host that holds an aggregated `responses` map) provides
 * a callback here. useExerciseSave fires it synchronously inside `save()`
 * BEFORE the debounced DB upsert — so the slide-gate (which reads from the
 * local responses map) flips to `is_complete=true` instantly when the
 * participant selects an option, instead of waiting for the DB round-trip
 * or, worse, never updating until the participant navigates away and back.
 */
export type LocalResponseUpdater = (
  exerciseId: string,
  responseJson: unknown,
  isComplete: boolean
) => void

export const LocalResponseUpdateContext = createContext<LocalResponseUpdater | null>(null)

export function useExerciseSave({
  exerciseId,
  participantId,
  sessionId,
  debounceMs = 300,
}: UseExerciseSaveOptions): UseExerciseSaveResult {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localUpdate = useContext(LocalResponseUpdateContext)

  const doSave = useCallback(async (responseJson: unknown, isComplete = false) => {
    setStatus('saving')

    const { error } = await supabase
      .from('responses')
      .upsert(
        {
          participant_id: participantId,
          exercise_id: exerciseId,
          session_id: sessionId ?? null,
          response_json: responseJson as never,
          is_complete: isComplete,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'participant_id,exercise_id,session_id' }
      )

    if (error) {
      setStatus('error')
      console.error('[useExerciseSave]', error.message)
      return
    }

    setStatus('saved')
    setTimeout(() => setStatus('idle'), 1500)
  }, [exerciseId, participantId, sessionId])

  const save = useCallback((responseJson: unknown, isComplete = false) => {
    // 1. Update the host's local cache synchronously so any slide gate /
    //    completion indicator that reads from the responses map reflects
    //    the change immediately.
    localUpdate?.(exerciseId, responseJson, isComplete)

    // 2. Persist to Supabase after the debounce.
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSave(responseJson, isComplete), debounceMs)
  }, [doSave, debounceMs, localUpdate, exerciseId])

  return { save, saveImmediate: doSave, status }
}
