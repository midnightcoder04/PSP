import { useNavigate } from 'react-router-dom'
import type { SectionFraming } from '@/types/database'
import { SectionClosing } from './SectionClosing'
import { ROUTES } from '@/lib/constants'
import styles from './SectionClosingSlide.module.css'

interface SectionClosingSlideProps {
  framing: SectionFraming | null | undefined
  nextSectionSlug: string | null
  isLastSection: boolean
}

export function SectionClosingSlide({
  framing,
  nextSectionSlug,
  isLastSection,
}: SectionClosingSlideProps) {
  const navigate = useNavigate()

  if (!framing) {
    // Section has no framing — still surface a navigation control.
    return (
      <div className={styles.container}>
        <div className={styles.actions}>
          {isLastSection ? (
            <button
              type="button"
              className={styles.continueBtn}
              onClick={() => navigate(ROUTES.COURSE_COMPLETE)}
            >
              Finish course →
            </button>
          ) : (
            <button
              type="button"
              className={styles.continueBtn}
              onClick={() => navigate(`/course/${nextSectionSlug}`)}
            >
              Continue to next section →
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <SectionClosing
        framing={framing}
        nextSectionSlug={isLastSection ? null : nextSectionSlug}
        showContinue={false}
      />
      <div className={styles.actions}>
        {isLastSection ? (
          <button
            type="button"
            className={styles.continueBtn}
            onClick={() => navigate(ROUTES.COURSE_COMPLETE)}
          >
            Finish course →
          </button>
        ) : (
          <button
            type="button"
            className={styles.continueBtn}
            onClick={() => navigate(`/course/${nextSectionSlug}`)}
          >
            Continue to next section →
          </button>
        )}
      </div>
    </div>
  )
}
