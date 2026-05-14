import { useMemo } from 'react'

export function sumCurrencyColumn(rows: string[][], columnIndex: number): number {
  let total = 0
  for (const row of rows) {
    const raw = row[columnIndex]
    if (raw == null) continue
    const cleaned = String(raw).replace(/[\s,$]/g, '')
    if (cleaned === '') continue
    const n = parseFloat(cleaned)
    if (!Number.isFinite(n)) continue
    total += n
  }
  return total
}

interface UseValuesTotalArgs {
  rows: string[][]
  currencyColumn: number
}

export function useValuesTotal({ rows, currencyColumn }: UseValuesTotalArgs): number {
  return useMemo(
    () => sumCurrencyColumn(rows, currencyColumn),
    [rows, currencyColumn]
  )
}
