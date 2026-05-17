import type { SectionFraming } from '@/types/database'
import { SectionOpening } from './SectionOpening'
import styles from './SectionIntroSlide.module.css'

interface SectionIntroSlideProps {
  framing: SectionFraming | null | undefined
  onBegin: () => void
}

export function SectionIntroSlide({ framing, onBegin }: SectionIntroSlideProps) {
  if (!framing) return null

  const reading = framing.reading_material ?? null

  return (
    <div className={styles.container}>
      <SectionOpening framing={framing} />

      {reading && (
        <aside className={styles.readingBlock}>
          <span className={styles.label}>Anything to read</span>
          {reading.url ? (
            <h4 className={styles.readingTitle}>
              <a
                href={reading.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.readingLink}
              >
                {reading.title}
              </a>
            </h4>
          ) : (
            <h4 className={styles.readingTitle}>{reading.title}</h4>
          )}
          <p className={styles.readingContent}>{reading.content}</p>
        </aside>
      )}

      <div className={styles.beginRow}>
        <button type="button" className={styles.beginBtn} onClick={onBegin}>
          Begin →
        </button>
      </div>
    </div>
  )
}
