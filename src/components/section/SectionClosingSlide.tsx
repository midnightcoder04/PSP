import type { SectionFraming } from '@/types/database'
import { SectionClosing } from './SectionClosing'
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
  if (!framing) return null

  return (
    <div className={styles.container}>
      <SectionClosing
        framing={framing}
        nextSectionSlug={isLastSection ? null : nextSectionSlug}
        showContinue={true}
      />
    </div>
  )
}
