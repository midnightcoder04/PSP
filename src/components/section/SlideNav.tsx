import styles from './SlideNav.module.css'

export interface SlideNavProps {
  onPrev: () => void
  onNext: () => void
  canGoPrev: boolean
  canGoNext: boolean
  nextLabel?: string
  prevLabel?: string
  hint?: string | null
  onBackToCourse?: () => void
}

export function SlideNav({
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
  nextLabel,
  prevLabel,
  hint,
  onBackToCourse,
}: SlideNavProps) {
  return (
    <nav className={styles.slideNav} aria-label="Slide navigation">
      <div className={styles.row}>
        <div className={styles.leftGroup}>
          <button
            type="button"
            onClick={onPrev}
            disabled={!canGoPrev}
            aria-label="Previous slide"
            className={styles.prev}
          >
            {prevLabel ?? '← Previous'}
          </button>
          {onBackToCourse && (
            <button
              type="button"
              onClick={onBackToCourse}
              className={styles.backLink}
            >
              ← Back to course
            </button>
          )}
        </div>

        {hint && !canGoNext && (
          <p className={styles.hint} aria-live="polite">
            {hint}
          </p>
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label={nextLabel ?? 'Next slide'}
          className={styles.next}
        >
          {nextLabel ?? 'Next →'}
        </button>
      </div>
    </nav>
  )
}
