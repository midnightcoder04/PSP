import { useState, useRef, useCallback } from 'react'
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

export function useExerciseSave({
  exerciseId,
  participantId,
  sessionId,
  debounceMs = 300,
}: UseExerciseSaveOptions): UseExerciseSaveResult {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSave(responseJson, isComplete), debounceMs)
  }, [doSave, debounceMs])

  return { save, saveImmediate: doSave, status }
}
