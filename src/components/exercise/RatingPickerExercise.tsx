import { useState, useEffect, useId } from 'react'
import { useExerciseSave } from '@/hooks/useExerciseSave'
import { isRatingPickerComplete } from '@/lib/exerciseCompletion'
import type {
  RatingPickerContent,
  RatingPickerResponse,
} from '@/types/database'
import styles from './RatingPickerExercise.module.css'

interface RatingPickerExerciseProps {
  exerciseId: string
  content: RatingPickerContent
  initialResponse?: RatingPickerResponse | null
  participantId: string
  sessionId?: string | null
  readOnly?: boolean
}

export function RatingPickerExercise({
  exerciseId,
  content,
  initialResponse,
  participantId,
  sessionId,
  readOnly = false,
}: RatingPickerExerciseProps) {
  const [ratings, setRatings] = useState<Record<string, number>>(
    () => initialResponse?.ratings ?? {}
  )
  const { save } = useExerciseSave({ exerciseId, participantId, sessionId })
  const idPrefix = useId()

  useEffect(() => {
    if (initialResponse?.ratings) setRatings(initialResponse.ratings)
  }, [initialResponse])

  function handleChange(itemId: string, rating: number) {
    if (readOnly) return
    const next = { ...ratings, [itemId]: rating }
    setRatings(next)
    const complete = isRatingPickerComplete(content, { ratings: next })
    save({ ratings: next }, complete)
  }

  const scaleValues: number[] = []
  for (let v = content.scale.min; v <= content.scale.max; v++) scaleValues.push(v)

  return (
    <div className={styles.container}>
      {content.prompt && <p className={styles.prompt}>{content.prompt}</p>}

      <div className={styles.scaleLegend} aria-hidden="true">
        {content.scale.labels && (
          <>
            <span>
              {content.scale.min} = {content.scale.labels[0]}
            </span>
            <span>
              {content.scale.max} ={' '}
              {content.scale.labels[content.scale.labels.length - 1]}
            </span>
          </>
        )}
      </div>

      <div className={styles.items}>
        {content.items.map((item) => {
          const groupId = `${idPrefix}-${item.id}`
          return (
            <fieldset key={item.id} className={styles.item} aria-labelledby={`${groupId}-legend`}>
              <legend id={`${groupId}-legend`} className={styles.itemLabel}>
                {item.label}
              </legend>
              <div className={styles.radioRow}>
                {scaleValues.map((v) => {
                  const radioId = `${groupId}-${v}`
                  const labelText = content.scale.labels?.[v - content.scale.min] ?? String(v)
                  return (
                    <label
                      key={v}
                      htmlFor={radioId}
                      className={styles.radioOption}
                      data-selected={ratings[item.id] === v}
                    >
                      <input
                        type="radio"
                        id={radioId}
                        name={groupId}
                        value={v}
                        checked={ratings[item.id] === v}
                        disabled={readOnly}
                        onChange={() => handleChange(item.id, v)}
                        className={styles.radioInput}
                      />
                      <span className={styles.radioNumber} aria-hidden="true">{v}</span>
                      <span className={styles.radioText}>{labelText}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )
        })}
      </div>
    </div>
  )
}
