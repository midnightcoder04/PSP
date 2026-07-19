import { useEffect, useRef } from 'react'
import { DeckSlideView } from './DeckSlideView'
import type { PresentedSlide, SessionCoverOverride } from '@/types/database'
import styles from './SlideMenu.module.css'

const CHAPTER_LABELS: Record<string, string> = {
  opening: 'Opening',
  personality: 'Personality',
  attitudes: 'Attitudes',
  values: 'Values',
  roles: 'Roles & Demands',
  skills: 'Transferable Skills',
  goals: 'Goal Setting',
  closing: 'Closing',
}

interface SlideMenuProps {
  slides: PresentedSlide[]
  coverOverride?: SessionCoverOverride | null
  currentIndex: number
  onSelect: (index: number) => void
  onClose: () => void
}

export function SlideMenu({ slides, coverOverride, currentIndex, onSelect, onClose }: SlideMenuProps) {
  const currentRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: 'center' })
  }, [])

  const chapters = [...new Set(slides.map((s) => s.chapter))]

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Slide menu">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Slides</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close slide menu">
            ×
          </button>
        </div>
        <div className={styles.chapters}>
          {chapters.map((chapter) => (
            <section key={chapter} className={styles.chapter}>
              <h3 className={styles.chapterHeading}>{CHAPTER_LABELS[chapter] ?? chapter}</h3>
              <div className={styles.grid}>
                {slides.map((slide, index) =>
                  slide.chapter === chapter ? (
                    <button
                      key={slide.id}
                      ref={index === currentIndex ? currentRef : undefined}
                      type="button"
                      className={styles.thumb}
                      data-current={index === currentIndex || undefined}
                      onClick={() => onSelect(index)}
                      aria-label={`Go to slide ${index + 1}`}
                    >
                      <span className={styles.thumbStageWrap} aria-hidden="true">
                        <span className={styles.thumbStage}>
                          <DeckSlideView slide={slide} coverOverride={coverOverride} />
                        </span>
                      </span>
                      <span className={styles.thumbLabel}>
                        {index + 1}
                        {slide.linked_exercise_slugs.length > 0 ? (
                          <span className={styles.linkedDot} title="Has live responses" />
                        ) : null}
                      </span>
                    </button>
                  ) : null
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
