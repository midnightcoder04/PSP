import styles from './PresenterHud.module.css'

interface PresenterHudProps {
  index: number
  total: number
  sessionTitle: string
  hasLinkedExercises: boolean
  responsesOpen: boolean
  isFullscreen: boolean
  onPrev: () => void
  onNext: () => void
  onToggleMenu: () => void
  onToggleResponses: () => void
  onToggleFullscreen: () => void
  onExit: () => void
}

export function PresenterHud({
  index,
  total,
  sessionTitle,
  hasLinkedExercises,
  responsesOpen,
  isFullscreen,
  onPrev,
  onNext,
  onToggleMenu,
  onToggleResponses,
  onToggleFullscreen,
  onExit,
}: PresenterHudProps) {
  return (
    <div className={styles.hud}>
      <div className={styles.left}>
        <button type="button" className={styles.hudBtn} onClick={onExit} title="Exit presentation">
          ✕ <span className={styles.btnLabel}>Exit</span>
        </button>
        <span className={styles.sessionTitle}>{sessionTitle}</span>
      </div>

      <div className={styles.center}>
        <button
          type="button"
          className={styles.hudBtn}
          onClick={onPrev}
          disabled={index === 0}
          aria-label="Previous slide"
        >
          ←
        </button>
        <span className={styles.counter} aria-live="polite">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          className={styles.hudBtn}
          onClick={onNext}
          disabled={index >= total - 1}
          aria-label="Next slide"
        >
          →
        </button>
      </div>

      <div className={styles.right}>
        <button type="button" className={styles.hudBtn} onClick={onToggleMenu} title="Slide menu (M)">
          ▤ <span className={styles.btnLabel}>Menu</span>
        </button>
        {hasLinkedExercises ? (
          <button
            type="button"
            className={styles.hudBtn}
            data-active={responsesOpen || undefined}
            onClick={onToggleResponses}
            title="Live responses (R)"
          >
            ◉ <span className={styles.btnLabel}>Responses</span>
          </button>
        ) : null}
        <button
          type="button"
          className={styles.hudBtn}
          onClick={onToggleFullscreen}
          title="Fullscreen (F)"
        >
          {isFullscreen ? '⤢' : '⛶'} <span className={styles.btnLabel}>{isFullscreen ? 'Windowed' : 'Fullscreen'}</span>
        </button>
      </div>
    </div>
  )
}
