import { useMemo } from 'react'

export const WATUSI_TIEBREAK_ORDER = ['w', 'a', 't', 'u', 's', 'i'] as const
export type WatusiGroup = (typeof WATUSI_TIEBREAK_ORDER)[number]
export type WatusiCounts = Record<WatusiGroup, number>

export function deriveWatusiCounts(checked: string[]): WatusiCounts {
  const counts: WatusiCounts = { w: 0, a: 0, t: 0, u: 0, s: 0, i: 0 }
  for (const id of checked) {
    const sepIdx = id.indexOf('_')
    if (sepIdx <= 0) continue
    const prefix = id.slice(0, sepIdx) as WatusiGroup
    if (prefix in counts) counts[prefix] += 1
  }
  return counts
}

export function watusiOrderFromCounts(counts: WatusiCounts): string[] {
  const groups = [...WATUSI_TIEBREAK_ORDER]
  groups.sort((a, b) => {
    if (counts[b] !== counts[a]) return counts[b] - counts[a]
    return WATUSI_TIEBREAK_ORDER.indexOf(a) - WATUSI_TIEBREAK_ORDER.indexOf(b)
  })
  return groups.map((g) => `attitude_${g}`)
}

interface UseWatusiCountsArgs {
  checked: string[] | null | undefined
}

export function useWatusiCounts({ checked }: UseWatusiCountsArgs) {
  return useMemo(() => deriveWatusiCounts(checked ?? []), [checked])
}
