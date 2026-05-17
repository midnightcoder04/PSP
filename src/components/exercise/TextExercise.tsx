import { useState, useEffect } from 'react'
import { useExerciseSave } from '@/hooks/useExerciseSave'
import { parseBlocks } from '@/lib/markdownBlocks'
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

  // 006-iter6 / US4 (T061): render the prompt via the shared block-aware
  // parser so numbered/bulleted lines become semantic <ol>/<ul> blocks.
  const promptBlocks = parseBlocks(content.prompt)

  return (
    <div className={styles.container}>
      <div className={styles.prompt}>
        {promptBlocks.map((b, i) => {
          if (b.kind === 'br') return <br key={i} />
          if (b.kind === 'p') return <p key={i}>{b.text}</p>
          if (b.kind === 'ol') {
            return (
              <ol key={i} className={styles.numberedList}>
                {b.items.map((it, j) => <li key={j}>{it}</li>)}
              </ol>
            )
          }
          return (
            <ul key={i} className={styles.bulletList}>
              {b.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          )
        })}
      </div>
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
