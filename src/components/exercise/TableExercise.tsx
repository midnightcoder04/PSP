import { useState, useEffect } from 'react'
import { useExerciseSave } from '@/hooks/useExerciseSave'
import styles from './TableExercise.module.css'

interface TableContent {
  prompt: string
  headers: string[]
  rows: number
  col_types?: string[]
}

interface TableResponse {
  rows: string[][]
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

  function handleCellChange(rowIdx: number, colIdx: number, value: string) {
    if (readOnly) return
    const next = rows.map((row, r) =>
      r === rowIdx ? row.map((cell, c) => (c === colIdx ? value : cell)) : row
    )
    setRows(next)
    const filled = next.some((row) => row.some((cell) => cell.trim() !== ''))
    save({ rows: next }, filled)
  }

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{content.prompt}</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {content.headers.map((h) => (
                <th key={h} className={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className={styles.td}>
                    {readOnly ? (
                      <span className={styles.cellText}>{cell}</span>
                    ) : (
                      <input
                        type="text"
                        className={styles.cellInput}
                        value={cell}
                        onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                        onBlur={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                        aria-label={`Row ${rowIdx + 1}, ${content.headers[colIdx]}`}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
