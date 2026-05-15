import { GROUP_META, type GroupSlug } from '@/lib/constants'
import styles from './SectionGroupContext.module.css'

// Small "Self Awareness · 3 of 5" affordance for the section page header.
// Section-scoped helper under `src/components/section/`, not a new shared primitive
// (FR-019 sign-off recorded in specs/004-content-restructure/tasks.md T054).
interface SectionGroupContextProps {
  groupSlug: GroupSlug | null | undefined
  positionInGroup: number
  groupSize: number
}

export function SectionGroupContext({ groupSlug, positionInGroup, groupSize }: SectionGroupContextProps) {
  if (!groupSlug || !(groupSlug in GROUP_META)) return null
  const meta = GROUP_META[groupSlug]
  const label = `${meta.title} · ${positionInGroup} of ${groupSize}`
  return (
    <span className={styles.context} aria-label={label}>
      {label}
    </span>
  )
}
