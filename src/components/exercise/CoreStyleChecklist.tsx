import { CheckboxExercise } from './CheckboxExercise'
import { pickStyleBlock } from '@/lib/coreStyle'
import type {
  CoreStyleChecklistContent,
  Response,
} from '@/types/database'
import styles from './CoreStyleInfo.module.css'

interface CoreStyleChecklistProps {
  exerciseId: string
  content: CoreStyleChecklistContent
  initialResponse?: { selected_ids: string[] } | null
  participantId: string
  sessionId?: string | null
  readOnly?: boolean
  q1Response?: Response | null
  q2Response?: Response | null
}

/**
 * 006-iter6 / US3 (T039): dispatcher wrapper that picks the matched-style
 * option list from `content.options_by_style` and forwards to the standard
 * `CheckboxExercise`. Falls back to a non-interactive prompt when the quiz
 * answers don't resolve a style.
 *
 * Contract: specs/006-iter6-personality-watusi-polish/contracts/personality-deep-dive.md
 */
export function CoreStyleChecklist({
  exerciseId,
  content,
  initialResponse,
  participantId,
  sessionId,
  readOnly = false,
  q1Response,
  q2Response,
}: CoreStyleChecklistProps) {
  const options = pickStyleBlock(
    content.options_by_style,
    q1Response?.response_json as { selected_ids?: string[] } | null,
    q2Response?.response_json as { selected_ids?: string[] } | null
  )

  if (options === null) {
    return (
      <div className={styles.container}>
        <div className={`${styles.text} ${styles.fallback}`}>
          <p>
            Answer the two questions on the quiz slide to see your matched
            style's optional Characteristics Checklist here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <CheckboxExercise
      exerciseId={exerciseId}
      content={{
        prompt: content.prompt,
        options,
        allow_multiple: true,
      }}
      initialResponse={initialResponse}
      participantId={participantId}
      sessionId={sessionId}
      readOnly={readOnly}
      showTally={false}
    />
  )
}
