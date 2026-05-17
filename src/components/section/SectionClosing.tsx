import { useNavigate } from 'react-router-dom'
import type { SectionFraming } from '@/types/database'
import styles from './SectionClosing.module.css'

interface SectionClosingProps {
  framing: SectionFraming | null | undefined
  nextSectionSlug: string | null
  showContinue?: boolean
}

export function SectionClosing({
  framing,
  nextSectionSlug,
  showContinue = true,
}: SectionClosingProps) {
  const navigate = useNavigate()
  if (!framing) return null

  const isFinal = nextSectionSlug === null
  const buttonLabel = isFinal ? 'Return to course home' : 'Continue to next section →'
  const target = isFinal ? '/course' : `/course/${nextSectionSlug}`

  return (
    <div className={styles.container}>
      <div className={styles.reflection}>
        <span className={styles.label}>Closing reflection</span>
        <p>{framing.closing_reflection}</p>
      </div>

      {framing.bridge_to_next && (
        <p className={styles.bridge}>{framing.bridge_to_next}</p>
      )}

      {showContinue && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.continueBtn}
            onClick={() => navigate(target)}
          >
            {buttonLabel}
          </button>
        </div>
      )}
    </div>
  )
}
