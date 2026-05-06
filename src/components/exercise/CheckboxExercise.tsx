import { useState, useEffect } from 'react'
import { useExerciseSave } from '@/hooks/useExerciseSave'
import styles from './CheckboxExercise.module.css'

interface Option {
  id: string
  label: string
  value?: number
}

interface CheckboxContent {
  prompt: string
  options: Option[]
  allow_multiple?: boolean
}

interface CheckboxResponse {
  selected_ids: string[]
}

interface CheckboxExerciseProps {
  exerciseId: string
  content: CheckboxContent
  initialResponse?: CheckboxResponse | null
  participantId: string
  sessionId?: string | null
  readOnly?: boolean
}

export function CheckboxExercise({
  exerciseId,
  content,
  initialResponse,
  participantId,
  sessionId,
  readOnly = false,
}: CheckboxExerciseProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialResponse?.selected_ids ?? [])
  )
  const { save, status } = useExerciseSave({ exerciseId, participantId, sessionId })

  useEffect(() => {
    setSelected(new Set(initialResponse?.selected_ids ?? []))
  }, [initialResponse])

  function toggle(id: string) {
    if (readOnly) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (content.allow_multiple === false) {
        next.clear()
        next.add(id)
      } else if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      const selectedIds = Array.from(next)
      save({ selected_ids: selectedIds }, selectedIds.length > 0)
      return next
    })
  }

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{content.prompt}</p>
      <ul className={styles.options} role="group" aria-label={content.prompt}>
        {content.options.map((opt) => {
          const checked = selected.has(opt.id)
          return (
            <li key={opt.id}>
              <label className={`${styles.option} ${checked ? styles.checked : ''} ${readOnly ? styles.readOnly : ''}`}>
                <input
                  type={content.allow_multiple === false ? 'radio' : 'checkbox'}
                  checked={checked}
                  onChange={() => toggle(opt.id)}
                  disabled={readOnly}
                  className={styles.input}
                />
                <span className={styles.label}>{opt.label}</span>
              </label>
            </li>
          )
        })}
      </ul>
      {!readOnly && status === 'saved' && (
        <span className={styles.savedIndicator} aria-live="polite">✓ Saved</span>
      )}
    </div>
  )
}
