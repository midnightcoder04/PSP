import { useState, useEffect, useCallback } from 'react'
import { useExerciseSave } from '@/hooks/useExerciseSave'
import { fetchGoalNames } from '@/lib/goalNames'
import styles from './CrossImpactMatrix.module.css'

interface CrossImpactContent {
  prompt: string
}

interface CrossImpactResponse {
  goalNames: string[]
  matrix: string[][]
}

interface CrossImpactMatrixProps {
  exerciseId: string
  content: CrossImpactContent
  initialResponse?: CrossImpactResponse | null
  participantId: string
  sessionId?: string | null
  readOnly?: boolean
}

const GOALS = 8
const SYMBOLS = ['', '+', '0', '−'] as const

function emptyMatrix(): string[][] {
  return Array.from({ length: GOALS }, () => Array(GOALS).fill(''))
}

function emptyNames(): string[] {
  return Array<string>(GOALS).fill('')
}


export function CrossImpactMatrix({
  exerciseId,
  content,
  initialResponse,
  participantId,
  sessionId,
  readOnly = false,
}: CrossImpactMatrixProps) {
  const hasSavedNames = initialResponse?.goalNames?.some((n) => n.trim())

  const [goalNames, setGoalNames] = useState<string[]>(
    () => initialResponse?.goalNames ?? emptyNames()
  )
  const [matrix, setMatrix] = useState<string[][]>(
    () => initialResponse?.matrix ?? emptyMatrix()
  )
  const { save } = useExerciseSave({ exerciseId, participantId, sessionId })

  // Sync if initialResponse changes (e.g. section reload)
  useEffect(() => {
    setGoalNames(initialResponse?.goalNames ?? emptyNames())
    setMatrix(initialResponse?.matrix ?? emptyMatrix())
  }, [initialResponse])

  // Pre-fill goal names from goal-priorities when none are saved yet
  useEffect(() => {
    if (hasSavedNames || readOnly) return
    fetchGoalNames(participantId, sessionId).then((names) => {
      if (names.some((n) => n)) setGoalNames(names)
    })
  }, [participantId, sessionId, hasSavedNames, readOnly])

  const persist = useCallback(
    (names: string[], mat: string[][]) => {
      const anyFilled =
        names.some((n) => n.trim()) ||
        mat.some((row) => row.some((c) => c !== ''))
      save({ goalNames: names, matrix: mat }, anyFilled)
    },
    [save]
  )

  function handleNameChange(idx: number, value: string) {
    if (readOnly) return
    const next = goalNames.map((n, i) => (i === idx ? value : n))
    setGoalNames(next)
  }

  function handleNameBlur(idx: number, value: string) {
    if (readOnly) return
    const next = goalNames.map((n, i) => (i === idx ? value : n))
    setGoalNames(next)
    persist(next, matrix)
  }

  function handleCellChange(row: number, col: number, value: string) {
    if (readOnly || row === col) return
    const next = matrix.map((r, ri) =>
      ri === row ? r.map((c, ci) => (ci === col ? value : c)) : r
    )
    setMatrix(next)
    persist(goalNames, next)
  }

  const colLabel = (idx: number) => goalNames[idx]?.trim() || `Goal ${idx + 1}`

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{content.prompt}</p>

      <div className={styles.legend}>
        <span className={styles.legendTitle}>Impact symbols:</span>
        <span className={styles.chip} data-symbol="+">+ Positive</span>
        <span className={styles.chip} data-symbol="0">0 Neutral</span>
        <span className={styles.chip} data-symbol="−">− Negative</span>
      </div>

      <div className={styles.goalsGrid}>
        {Array.from({ length: GOALS }, (_, i) => (
          <div key={i} className={styles.goalRow}>
            <span className={styles.goalBadge}>{i + 1}</span>
            <input
              type="text"
              className={styles.goalInput}
              value={goalNames[i]}
              onChange={(e) => handleNameChange(i, e.target.value)}
              onBlur={(e) => handleNameBlur(i, e.target.value)}
              placeholder={`Goal ${i + 1}`}
              aria-label={`Goal ${i + 1} name`}
              readOnly={readOnly}
            />
          </div>
        ))}
      </div>

      <div className={styles.matrixWrap}>
        <table className={styles.matrix} aria-label="Cross-impact matrix">
          <thead>
            <tr>
              <th className={styles.cornerCell} aria-hidden="true" />
              {Array.from({ length: GOALS }, (_, ci) => (
                <th key={ci} className={styles.colHead} scope="col">
                  <div className={styles.colHeadInner}>
                    <span className={styles.colNum}>{ci + 1}</span>
                    <span className={styles.colLabel}>{colLabel(ci)}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: GOALS }, (_, ri) => (
              <tr key={ri}>
                <th className={styles.rowHead} scope="row">
                  <span className={styles.rowBadge}>{ri + 1}</span>
                  <span className={styles.rowLabel}>{colLabel(ri)}</span>
                </th>
                {Array.from({ length: GOALS }, (_, ci) => {
                  const isDiag = ri === ci
                  const val = matrix[ri]?.[ci] ?? ''
                  return (
                    <td
                      key={ci}
                      className={styles.cell}
                      data-symbol={val || undefined}
                      data-diag={isDiag || undefined}
                    >
                      {isDiag ? (
                        <span className={styles.diagMark} aria-hidden="true">—</span>
                      ) : readOnly ? (
                        <span className={styles.cellVal}>{val || '—'}</span>
                      ) : (
                        <select
                          className={styles.cellSelect}
                          value={val}
                          onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                          aria-label={`Row ${ri + 1} → Col ${ci + 1}`}
                        >
                          {SYMBOLS.map((s) => (
                            <option key={s} value={s}>
                              {s === '' ? '—' : s}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
