import { useMemo } from 'react'
import type { Section, Progress } from '@/types/database'

export interface SectionLock {
  section: Section
  index: number
  isLocked: boolean
  prereq: Section | null
  prereqTitle: string | null
  /** Locked because the session's content restriction ends here, not because
   *  of sequential progress. Distinguishes messaging in the UI. */
  restricted?: boolean
}

/**
 * Pure function — exported for unit testing.
 * Sections must already be sorted by order_index (or the caller's preferred sequence).
 *
 * `restrictAfterSlug`, when set, force-locks every section after the one
 * matching that slug — regardless of progress — for sessions whose content
 * is restricted (e.g. ends after Values).
 */
export function computeSectionLocks(
  sections: Section[],
  progressMap: Map<string, Progress>,
  restrictAfterSlug?: string | null
): SectionLock[] {
  const restrictIndex = restrictAfterSlug
    ? sections.findIndex((s) => s.slug === restrictAfterSlug)
    : -1

  return sections.map((section, index) => {
    if (restrictIndex >= 0 && index > restrictIndex) {
      return { section, index, isLocked: true, prereq: null, prereqTitle: null, restricted: true }
    }
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
  restrictAfterSlug?: string | null
}

export function useSectionLock(args: UseSectionLockArgs): SectionLock[] {
  const { sections, progressMap, restrictAfterSlug } = args
  return useMemo(
    () => computeSectionLocks(sections, progressMap, restrictAfterSlug),
    [sections, progressMap, restrictAfterSlug]
  )
}
