import type { ReactNode } from 'react'
import type { SectionGroup } from '@/types/database'
import styles from './GroupBand.module.css'

// GroupBand renders one pedagogical phase (Self Awareness / Goal Setting /
// Strategic Planning) as a labelled <section> band with its constituent
// section cards in the children slot. Per-group background tint comes from the
// data-group attribute (CSS maps `self-awareness`/`goal-setting`/`strategic-planning`
// to existing trust-/warmth-/growth-light tokens). Section-scoped helper —
// not a new shared primitive (specs/004-content-restructure/tasks.md T015 sign-off).
interface GroupBandProps {
  group: SectionGroup
  children: ReactNode
}

export function GroupBand({ group, children }: GroupBandProps) {
  if (group.sections.length === 0) return null

  return (
    <section
      className={styles.band}
      data-group={group.slug}
      aria-labelledby={`group-${group.slug}-title`}
    >
      <header className={styles.header}>
        <h2 className={styles.title} id={`group-${group.slug}-title`}>
          {group.title}
        </h2>
        <p className={styles.description}>{group.description}</p>
      </header>
      <div className={styles.body} role="list">
        {children}
      </div>
    </section>
  )
}
