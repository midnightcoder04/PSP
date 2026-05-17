import styles from './SlideNav.module.css'

export interface SlideNavProps {
  onPrev: () => void
  onNext: () => void
  canGoPrev: boolean
  canGoNext: boolean
  nextLabel?: string
  prevLabel?: string
  hint?: string | null
}

export function SlideNav({
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
  nextLabel,
  prevLabel,
  hint,
}: SlideNavProps) {
  return (
    <nav className={styles.slideNav} aria-label="Slide navigation">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label="Previous slide"
        className={styles.prev}
      >
        {prevLabel ?? '← Previous'}
      </button>

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
    </nav>
  )
}
