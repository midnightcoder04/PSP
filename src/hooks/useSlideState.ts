import { useState, useMemo, useCallback } from 'react'
import type { Exercise, Response } from '@/types/database'

export interface UseSlideStateArgs {
  intro: boolean
  slideGroups: Exercise[][]
  responses: Record<string, Response>
  resumeExerciseId?: string | null
}

export interface UseSlideStateResult {
  currentSlide: number
  canGoNext: boolean
  canGoPrev: boolean
  goNext: () => void
  goPrev: () => void
  goTo: (slide: number) => void
  isAtIntro: boolean
  isAtClosing: boolean
}

function groupComplete(group: Exercise[], responses: Record<string, Response>): boolean {
  return group.every(
    (ex) => ex.type === 'info' || responses[ex.id]?.is_complete === true
  )
}

function findGroupIndex(groups: Exercise[][], exerciseId: string): number {
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].some((ex) => ex.id === exerciseId)) return i
  }
  return -1
}

export function useSlideState(args: UseSlideStateArgs): UseSlideStateResult {
  const { intro, slideGroups, responses, resumeExerciseId } = args
  const totalGroups = slideGroups.length

  const initialSlide = useMemo(() => {
    if (resumeExerciseId) {
      const idx = findGroupIndex(slideGroups, resumeExerciseId)
      if (idx >= 0) return idx
    }
    const allDone =
      totalGroups > 0 && slideGroups.every((g) => groupComplete(g, responses))
    if (allDone) return totalGroups
    return intro ? -1 : 0
    // We only want the initial value — intentionally omit responses from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [currentSlide, setCurrentSlide] = useState<number>(initialSlide)

  const canGoNext = useMemo(() => {
    if (currentSlide === -1) return true
    if (currentSlide >= totalGroups) return true
    const group = slideGroups[currentSlide]
    if (!group) return false
    return groupComplete(group, responses)
  }, [currentSlide, slideGroups, responses, totalGroups])

  const canGoPrev = currentSlide > -1

  const goNext = useCallback(() => {
    setCurrentSlide((c) => {
      if (c === -1) return 0
      if (c >= totalGroups) return c
      const group = slideGroups[c]
      if (!group || !groupComplete(group, responses)) return c
      return Math.min(c + 1, totalGroups)
    })
  }, [slideGroups, responses, totalGroups])

  const goPrev = useCallback(() => {
    setCurrentSlide((c) => Math.max(c - 1, -1))
  }, [])

  const goTo = useCallback(
    (slide: number) => {
      setCurrentSlide(() => {
        const lower = intro ? -1 : 0
        return Math.max(lower, Math.min(slide, totalGroups))
      })
    },
    [intro, totalGroups]
  )

  return {
    currentSlide,
    canGoNext,
    canGoPrev,
    goNext,
    goPrev,
    goTo,
    isAtIntro: currentSlide === -1,
    isAtClosing: currentSlide >= totalGroups,
  }
}
