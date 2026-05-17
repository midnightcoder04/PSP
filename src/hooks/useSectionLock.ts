import { useMemo } from 'react'
import type { Section, Progress } from '@/types/database'

export interface SectionLock {
  section: Section
  index: number
  isLocked: boolean
  prereq: Section | null
  prereqTitle: string | null
}

/**
 * Pure function — exported for unit testing.
 * Sections must already be sorted by order_index (or the caller's preferred sequence).
 */
export function computeSectionLocks(
  sections: Section[],
  progressMap: Map<string, Progress>
): SectionLock[] {
  return sections.map((section, index) => {
    if (index === 0) {
      return { section, index, isLocked: false, prereq: null, prereqTitle: null }
    }
    const prereq = sections[index - 1]
    const prereqProgress = progressMap.get(prereq.id)
    const isLocked = prereqProgress?.section_completed_at == null
    return {
      section,
      index,
      isLocked,
      prereq,
      prereqTitle: prereq.title,
    }
  })
}

export interface UseSectionLockArgs {
  sections: Section[]
  progressMap: Map<string, Progress>
}

export function useSectionLock(args: UseSectionLockArgs): SectionLock[] {
  const { sections, progressMap } = args
  return useMemo(() => computeSectionLocks(sections, progressMap), [sections, progressMap])
}
