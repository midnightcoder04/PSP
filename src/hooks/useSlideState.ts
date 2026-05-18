import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { Exercise, Response } from '@/types/database'

export interface UseSlideStateArgs {
  intro: boolean
  slideGroups: Exercise[][]
  responses: Record<string, Response>
  resumeExerciseId?: string | null
  /**
   * 005-iter5-ux-fixes / US3: caller-provided identity for the surrounding
   * section (typically `sectionSlug`). When this changes AND `slideGroups`
   * is ready, the hook re-derives `initialSlide` and resets `currentSlide`.
   * Leaving this undefined preserves the pre-iter5 behaviour for any
   * caller that hasn't opted in.
   * Contract: specs/005-iter5-ux-fixes/contracts/slide-state.md
   */
  resetKey?: string
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
  return group.every((ex) => {
    if (ex.type === 'info') return true
    return responses[ex.id]?.is_complete === true
  })
}

function findGroupIndex(groups: Exercise[][], exerciseId: string): number {
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].some((ex) => ex.id === exerciseId)) return i
  }
  return -1
}

function deriveInitialSlide(args: UseSlideStateArgs): number {
  const { intro, slideGroups, responses, resumeExerciseId } = args
  const totalGroups = slideGroups.length
  if (resumeExerciseId) {
    const idx = findGroupIndex(slideGroups, resumeExerciseId)
    if (idx >= 0) return idx
  }
  const allDone =
    totalGroups > 0 && slideGroups.every((g) => groupComplete(g, responses))
  if (allDone) return totalGroups
  return intro ? -1 : 0
}

export function useSlideState(args: UseSlideStateArgs): UseSlideStateResult {
  const { intro, slideGroups, responses, resetKey } = args
  const totalGroups = slideGroups.length

  // Stash latest args in a ref so the reset effect always reads fresh values
  // without re-running on every response tick.
  const argsRef = useRef(args)
  argsRef.current = args

  const [currentSlide, setCurrentSlide] = useState<number>(() => deriveInitialSlide(args))

  // 005-iter5-ux-fixes / US3: when the host section changes (resetKey) AND
  // data is ready (slideGroups is non-empty), re-derive the initial slide.
  // Deliberately depends on resetKey + slideGroups.length only — not on
  // responses or resumeExerciseId — to avoid mid-section jumps.
  useEffect(() => {
    if (resetKey === undefined) return
    if (slideGroups.length === 0) return
    setCurrentSlide(deriveInitialSlide(argsRef.current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, slideGroups.length])

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
