import type { SectionFraming } from '@/types/database'
import styles from './SectionOpening.module.css'

interface SectionOpeningProps {
  framing: SectionFraming | null | undefined
}

export function SectionOpening({ framing }: SectionOpeningProps) {
  if (!framing) return null

  return (
    <div className={styles.container}>
      <blockquote className={styles.quote}>
        <p className={styles.quoteText}>{framing.opening_quote.text}</p>
        <cite className={styles.quoteAttribution}>{framing.opening_quote.attribution}</cite>
      </blockquote>

      <aside role="note" className={styles.openingQuestion}>
        <span className={styles.label}>Opening question</span>
        <p>{framing.opening_question}</p>
      </aside>

      <div className={styles.facilitatorNote}>
        <span className={styles.label}>Facilitator says</span>
        <p>{framing.facilitator_says}</p>
      </div>

      <div className={styles.whyItMatters}>
        <span className={styles.label}>Why this matters</span>
        <p>{framing.why_it_matters}</p>
      </div>
    </div>
  )
}
