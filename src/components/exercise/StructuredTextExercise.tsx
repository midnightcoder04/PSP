import { useState, useEffect, useId } from 'react'
import { useExerciseSave } from '@/hooks/useExerciseSave'
import { isStructuredTextComplete } from '@/lib/exerciseCompletion'
import type {
  StructuredTextContent,
  StructuredTextResponse,
} from '@/types/database'
import styles from './StructuredTextExercise.module.css'

interface StructuredTextExerciseProps {
  exerciseId: string
  content: StructuredTextContent
  initialResponse?: StructuredTextResponse | null
  participantId: string
  sessionId?: string | null
  readOnly?: boolean
  /** When provided, group questions by goal number and show a goal name header */
  goalNames?: string[]
}

function parseGoalNum(id: string): number | null {
  const m = id.match(/^goal(\d+)_/)
  return m ? parseInt(m[1], 10) : null
}

/** Strip the "Goal N — " prefix from a prompt since the group header provides that context */
function stripGoalPrefix(prompt: string): string {
  return prompt.replace(/^Goal \d+ — /, '')
}

export function StructuredTextExercise({
  exerciseId,
  content,
  initialResponse,
  participantId,
  sessionId,
  readOnly = false,
  goalNames,
}: StructuredTextExerciseProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => initialResponse?.answers ?? {}
  )
  const { save } = useExerciseSave({ exerciseId, participantId, sessionId })
  const idPrefix = useId()

  useEffect(() => {
    if (initialResponse?.answers) setAnswers(initialResponse.answers)
  }, [initialResponse])

  function handleChange(questionId: string, value: string) {
    if (readOnly) return
    const next = { ...answers, [questionId]: value }
    setAnswers(next)
    const complete = isStructuredTextComplete(content, { answers: next })
    const payload: StructuredTextResponse = { answers: next }
    if (initialResponse?._legacy) payload._legacy = initialResponse._legacy
    save(payload, complete)
  }

  const preamble = content.intro ?? content.prompt

  // Grouped rendering: when goalNames is provided and all (or most) questions
  // follow the goal{N}_... id pattern, render one section per goal.
  const useGrouped =
    goalNames != null &&
    goalNames.length > 0 &&
    content.questions.length > 0 &&
    content.questions.every((q) => parseGoalNum(q.id) !== null)

  if (useGrouped) {
    // Build ordered groups: goal 1..N in ascending order
    const groups = new Map<number, typeof content.questions>()
    for (const q of content.questions) {
      const n = parseGoalNum(q.id)!
      if (!groups.has(n)) groups.set(n, [])
      groups.get(n)!.push(q)
    }
    const sortedGroups = [...groups.entries()].sort((a, b) => a[0] - b[0])

    return (
      <div className={styles.container}>
        {preamble && <p className={styles.prompt}>{preamble}</p>}
        {initialResponse?._legacy && (
          <aside className={styles.legacyBanner} role="note">
            <strong className={styles.legacyLabel}>Previous answer preserved</strong>
            <p className={styles.legacyContent}>{initialResponse._legacy}</p>
            <p className={styles.legacyHint}>
              We've kept your previous answer above. Please re-enter it into the
              structured fields below so it's easier to revisit later.
            </p>
          </aside>
        )}
        <div className={styles.goalGroups}>
          {sortedGroups.map(([goalNum, questions]) => {
            const goalName = goalNames![goalNum - 1] ?? ''
            return (
              <div key={goalNum} className={styles.goalGroup}>
                <div className={styles.goalGroupHeader}>
                  <span className={styles.goalGroupBadge}>{goalNum}</span>
                  <span className={styles.goalGroupName}>
                    {goalName || `Goal ${goalNum}`}
                  </span>
                </div>
                <div className={styles.questions}>
                  {questions.map((q, localIdx) => {
                    const inputId = `${idPrefix}-${q.id}`
                    const value = answers[q.id] ?? ''
                    const promptText = stripGoalPrefix(q.prompt ?? q.label ?? '')
                    const isRequired = q.required ?? (q.min_length ?? 1) >= 1
                    return (
                      <div key={q.id} className={styles.field}>
                        <label htmlFor={inputId} className={styles.label}>
                          <span className={styles.questionNum}>{localIdx + 1}.</span>{' '}
                          {promptText}
                          {isRequired && <span className={styles.requiredMark} aria-hidden="true"> *</span>}
                        </label>
                        <textarea
                          id={inputId}
                          className={styles.textarea}
                          value={value}
                          placeholder={q.placeholder ?? ''}
                          maxLength={q.max_length ?? undefined}
                          disabled={readOnly}
                          onChange={(e) => handleChange(q.id, e.target.value)}
                          onBlur={(e) => handleChange(q.id, e.target.value)}
                          rows={3}
                          aria-label={promptText}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {preamble && <p className={styles.prompt}>{preamble}</p>}

      {initialResponse?._legacy && (
        <aside className={styles.legacyBanner} role="note">
          <strong className={styles.legacyLabel}>Previous answer preserved</strong>
          <p className={styles.legacyContent}>{initialResponse._legacy}</p>
          <p className={styles.legacyHint}>
            We've kept your previous answer above. Please re-enter it into the
            structured fields below so it's easier to revisit later.
          </p>
        </aside>
      )}

      <div className={styles.questions}>
        {content.questions.map((q, index) => {
          const inputId = `${idPrefix}-${q.id}`
          const value = answers[q.id] ?? ''
          const promptText = q.prompt ?? q.label ?? ''
          const isRequired = q.required ?? (q.min_length ?? 1) >= 1
          return (
            <div key={q.id} className={styles.field}>
              <label htmlFor={inputId} className={styles.label}>
                <span className={styles.questionNum}>{index + 1}.</span>{' '}
                {promptText}
                {isRequired && <span className={styles.requiredMark} aria-hidden="true"> *</span>}
              </label>
              <textarea
                id={inputId}
                className={styles.textarea}
                value={value}
                placeholder={q.placeholder ?? ''}
                maxLength={q.max_length ?? undefined}
                disabled={readOnly}
                onChange={(e) => handleChange(q.id, e.target.value)}
                onBlur={(e) => handleChange(q.id, e.target.value)}
                rows={4}
                aria-label={promptText}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
