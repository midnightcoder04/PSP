import { useEffect, useState } from 'react'
import { useExerciseSave } from '@/hooks/useExerciseSave'
import type { TableContent, TableResponse } from '@/types/database'
import styles from './LifeGoalInventoryTable.module.css'

interface LifeGoalInventoryTableProps {
  exerciseId: string
  content: TableContent
  initialResponse?: TableResponse | null
  participantId: string
  sessionId?: string | null
  readOnly?: boolean
}

const categoryOptions = [
  { value: '', label: 'Select category' },
  { value: 'A', label: 'A — Career Satisfaction' },
  { value: 'B', label: 'B — Status and Respect' },
  { value: 'C', label: 'C — Personal Relationships' },
  { value: 'D', label: 'D — Learning and Education' },
  { value: 'E', label: 'E — Material Rewards and Possessions' },
  { value: 'F', label: 'F — Leisure Satisfaction' },
  { value: 'G', label: 'G — Spiritual Growth and Religion' },
  { value: 'H', label: 'H — Open' },
]

const hmLOptions = [
  { value: '', label: 'Select' },
  { value: 'H', label: 'High' },
  { value: 'M', label: 'Medium' },
  { value: 'L', label: 'Low' },
]

const yesNoOptions = [
  { value: '', label: 'Select' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
]

function normalizeRows(content: TableContent, initialResponse?: TableResponse | null): string[][] {
  const colCount = content.headers.length
  const savedRows = initialResponse?.rows ?? []
  return Array.from({ length: content.rows }, (_, rowIdx) => {
    const savedRow = savedRows[rowIdx] ?? []
    return Array.from({ length: colCount }, (_, colIdx) => savedRow[colIdx] ?? '')
  })
}

function getOptionsForColumn(header: string, colIdx: number) {
  const normalized = header.trim().toLowerCase()

  if (colIdx === 0) return categoryOptions
  if (normalized.includes('importance') || normalized.includes('ease')) return hmLOptions
  if (normalized.includes('conflict')) return yesNoOptions
  return null
}

function getDisplayHeader(header: string): string {
  return header.replace(/\s*\([^)]+\)\s*$/, '')
}

interface ScaleItem { letter: string; label: string; desc: string }
interface CategoryItem { letter: string; name: string }

function parseScale(line: string): { title: string; items: ScaleItem[] } | null {
  const ci = line.indexOf(': ')
  if (ci === -1) return null
  const title = line.slice(0, ci)
  const items = line
    .slice(ci + 2)
    .split(' | ')
    .map((s) => {
      const m = s.match(/^([A-Z])\s+\(([^)]+)\)\s+=\s+(.+)$/)
      return m ? { letter: m[1], label: m[2], desc: m[3] } : null
    })
    .filter(Boolean) as ScaleItem[]
  return items.length ? { title, items } : null
}

function parseCategories(section: string): CategoryItem[] {
  return section
    .split('\n')
    .slice(1)
    .map((line) => {
      const di = line.indexOf(' — ')
      if (di === -1) return null
      const letter = line.slice(0, di)
      const rest = line.slice(di + 3)
      const ci = rest.indexOf(': ')
      return { letter, name: ci === -1 ? rest : rest.slice(0, ci) }
    })
    .filter(Boolean) as CategoryItem[]
}

function StructuredPrompt({ prompt }: { prompt: string }) {
  const [catOpen, setCatOpen] = useState(false)

  const sections = prompt.split('\n\n')
  const intro = sections[0] ?? ''
  const importanceScale = parseScale(sections[1] ?? '')
  const easeScale = parseScale(sections[2] ?? '')
  const categories = parseCategories(sections[3] ?? '')

  return (
    <div className={styles.promptStructured}>
      <p className={styles.promptIntro}>{intro}</p>

      {(importanceScale || easeScale) && (
        <div className={styles.scaleGrid}>
          {[importanceScale, easeScale].filter(Boolean).map((scale) => (
            <div key={scale!.title} className={styles.scaleBlock}>
              <div className={styles.scaleTitle}>{scale!.title}</div>
              {scale!.items.map((item) => (
                <div key={item.letter} className={styles.scaleRow}>
                  <span className={styles.scaleLetter}>{item.letter}</span>
                  <span className={styles.scaleLabel}>{item.label}</span>
                  <span className={styles.scaleDesc}>{item.desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {categories.length > 0 && (
        <div className={styles.catDetails}>
          <button
            type="button"
            className={[styles.catSummary, catOpen ? styles.catSummaryOpen : ''].join(' ')}
            onClick={() => setCatOpen((v) => !v)}
            aria-expanded={catOpen}
          >
            Goal Categories (A – H)
          </button>
          <div className={[styles.catContent, catOpen ? styles.catContentOpen : ''].join(' ')}>
            <div className={styles.catGrid}>
              {categories.map((cat) => (
                <div key={cat.letter} className={styles.catItem}>
                  <span className={styles.catLetter}>{cat.letter}</span>
                  <span className={styles.catName}>{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getColWidth(colIdx: number, header: string): string | undefined {
  if (colIdx === 0) return '168px'
  if (colIdx === 1) return undefined  // flexible — gets all remaining space
  const normalized = header.trim().toLowerCase()
  if (normalized.includes('conflict')) return '144px'
  return '144px'
}

export function LifeGoalInventoryTable({
  exerciseId,
  content,
  initialResponse,
  participantId,
  sessionId,
  readOnly = false,
}: LifeGoalInventoryTableProps) {
  const [rows, setRows] = useState<string[][]>(() => normalizeRows(content, initialResponse))
  const { save } = useExerciseSave({ exerciseId, participantId, sessionId })

  useEffect(() => {
    setRows(normalizeRows(content, initialResponse))
  }, [content.rows, content.headers.length, initialResponse])

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
      <StructuredPrompt prompt={content.prompt} />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <colgroup>
            {content.headers.map((header, idx) => {
              const w = getColWidth(idx, header)
              return <col key={idx} style={w ? { width: w } : undefined} />
            })}
          </colgroup>
          <thead>
            <tr>
              {content.headers.map((header) => (
                <th key={header} className={styles.th}>
                  {getDisplayHeader(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, colIdx) => {
                  const header = content.headers[colIdx] ?? ''
                  const options = getOptionsForColumn(header, colIdx)
                  const isGoalColumn = colIdx === 1

                  return (
                    <td key={colIdx} className={styles.td} data-col-index={colIdx}>
                      {readOnly ? (
                        <span className={styles.cellText}>{cell}</span>
                      ) : options ? (
                        <select
                          className={styles.cellSelect}
                          value={cell}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          onBlur={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          aria-label={`Row ${rowIdx + 1}, ${header}`}
                        >
                          {options.map((option) => (
                            <option key={option.value || '__empty__'} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : isGoalColumn ? (
                        <textarea
                          className={styles.cellTextarea}
                          value={cell}
                          rows={2}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          onBlur={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          aria-label={`Row ${rowIdx + 1}, ${header}`}
                        />
                      ) : (
                        <input
                          type="text"
                          className={styles.cellInput}
                          value={cell}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          onBlur={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          aria-label={`Row ${rowIdx + 1}, ${header}`}
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
    </div>
  )
}
