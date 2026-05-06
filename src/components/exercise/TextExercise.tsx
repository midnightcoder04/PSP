import { useState, useEffect } from 'react'
import { useExerciseSave } from '@/hooks/useExerciseSave'
import styles from './TextExercise.module.css'

interface TextContent {
  prompt: string
  placeholder?: string
  min_length?: number
  max_length?: number
}

interface TextResponse {
  value: string
}

interface TextExerciseProps {
  exerciseId: string
  content: TextContent
  initialResponse?: TextResponse | null
  participantId: string
  sessionId?: string | null
  readOnly?: boolean
}

export function TextExercise({
  exerciseId,
  content,
  initialResponse,
  participantId,
  sessionId,
  readOnly = false,
}: TextExerciseProps) {
  const [value, setValue] = useState(initialResponse?.value ?? '')
  const { save, status } = useExerciseSave({ exerciseId, participantId, sessionId })
  const maxLength = content.max_length ?? 2000

  useEffect(() => {
    setValue(initialResponse?.value ?? '')
  }, [initialResponse])

  function handleChange(v: string) {
    setValue(v)
    save({ value: v }, v.trim().length > 0)
  }

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{content.prompt}</p>
      {readOnly ? (
        <div className={styles.readOnlyText}>
          {value || <span className={styles.empty}>No response recorded.</span>}
        </div>
      ) : (
        <>
          <textarea
            className={styles.textarea}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={content.placeholder ?? 'Write your reflection here…'}
            maxLength={maxLength}
            rows={6}
            aria-label={content.prompt}
          />
          <div className={styles.meta}>
            <span className={styles.charCount}>
              {value.length}/{maxLength}
            </span>
            {status === 'saved' && (
              <span className={styles.savedIndicator} aria-live="polite">✓ Saved</span>
            )}
            {status === 'saving' && (
              <span className={styles.savingIndicator}>Saving…</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
