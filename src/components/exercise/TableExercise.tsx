import { useState, useEffect, useMemo } from 'react'
import { useExerciseSave } from '@/hooks/useExerciseSave'
import { sumCurrencyColumn } from '@/hooks/useValuesTotal'
import { ValueBudgetWidget } from './ValueBudgetWidget'
import styles from './TableExercise.module.css'

interface TableContent {
  prompt: string
  headers: string[]
  rows: number
  col_types?: ('text' | 'number' | 'currency')[]
  total_target?: number
}

interface TableResponse {
  rows: string[][]
  total_spent?: number
}

interface TableExerciseProps {
  exerciseId: string
  content: TableContent
  initialResponse?: TableResponse | null
  participantId: string
  sessionId?: string | null
  readOnly?: boolean
}

function emptyRows(count: number, cols: number): string[][] {
  return Array.from({ length: count }, () => Array(cols).fill(''))
}

export function TableExercise({
  exerciseId,
  content,
  initialResponse,
  participantId,
  sessionId,
  readOnly = false,
}: TableExerciseProps) {
  const colCount = content.headers.length
  const [rows, setRows] = useState<string[][]>(
    initialResponse?.rows ?? emptyRows(content.rows, colCount)
  )
  const { save } = useExerciseSave({ exerciseId, participantId, sessionId })

  useEffect(() => {
    setRows(initialResponse?.rows ?? emptyRows(content.rows, colCount))
  }, [initialResponse, content.rows, colCount])

  const currencyColumnIndex = useMemo(() => {
    if (!content.col_types) return -1
    return content.col_types.findIndex((t) => t === 'currency')
  }, [content.col_types])

  const totalSpent = useMemo(() => {
    if (currencyColumnIndex < 0) return 0
    return sumCurrencyColumn(rows, currencyColumnIndex)
  }, [rows, currencyColumnIndex])

  function handleCellChange(rowIdx: number, colIdx: number, value: string) {
    if (readOnly) return
    const next = rows.map((row, r) =>
      r === rowIdx ? row.map((cell, c) => (c === colIdx ? value : cell)) : row
    )
    setRows(next)
    const filled = next.some((row) => row.some((cell) => cell.trim() !== ''))
    const payload: TableResponse = { rows: next }
    let complete = filled
    if (currencyColumnIndex >= 0) {
      const total = sumCurrencyColumn(next, currencyColumnIndex)
      payload.total_spent = total
      if (content.total_target != null) {
        complete = total === content.total_target
      }
    }
    save(payload, complete)
  }

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{content.prompt}</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {content.headers.map((h) => (
                <th key={h} className={styles.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, colIdx) => {
                  const colType = content.col_types?.[colIdx] ?? 'text'
                  const inputType =
                    colType === 'currency' || colType === 'number' ? 'number' : 'text'
                  const inputMode =
                    colType === 'currency' ? 'decimal' : colType === 'number' ? 'numeric' : 'text'
                  return (
                    <td
                      key={colIdx}
                      className={styles.td}
                      data-col-type={colType}
                    >
                      {readOnly ? (
                        <span className={styles.cellText}>{cell}</span>
                      ) : (
                        <input
                          type={inputType}
                          inputMode={inputMode}
                          className={styles.cellInput}
                          value={cell}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          onBlur={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          aria-label={`Row ${rowIdx + 1}, ${content.headers[colIdx]}`}
                          placeholder={colType === 'currency' ? '0' : undefined}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {currencyColumnIndex >= 0 && content.total_target != null && (
        <ValueBudgetWidget budget={content.total_target} spent={totalSpent} />
      )}
    </div>
  )
}
