import { useState, useEffect } from 'react'
import { useExerciseSave } from '@/hooks/useExerciseSave'
import styles from './RankingExercise.module.css'

interface RankItem {
  id: string
  label: string
}

interface RankingContent {
  prompt: string
  items: RankItem[]
}

interface RankingResponse {
  order: string[]
}

interface RankingExerciseProps {
  exerciseId: string
  content: RankingContent
  initialResponse?: RankingResponse | null
  participantId: string
  sessionId?: string | null
  readOnly?: boolean
}

export function RankingExercise({
  exerciseId,
  content,
  initialResponse,
  participantId,
  sessionId,
  readOnly = false,
}: RankingExerciseProps) {
  const [order, setOrder] = useState<string[]>(() => {
    if (initialResponse?.order?.length) return initialResponse.order
    return content.items.map((i) => i.id)
  })
  const { save } = useExerciseSave({ exerciseId, participantId, sessionId })

  useEffect(() => {
    if (initialResponse?.order?.length) {
      setOrder(initialResponse.order)
    }
  }, [initialResponse])

  const itemMap = Object.fromEntries(content.items.map((i) => [i.id, i.label]))

  function move(index: number, direction: 'up' | 'down') {
    if (readOnly) return
    const next = [...order]
    const swap = direction === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setOrder(next)
    save({ order: next }, true)
  }

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{content.prompt}</p>
      <ol className={styles.list}>
        {order.map((id, index) => (
          <li key={id} className={styles.item}>
            <span className={styles.rank}>{index + 1}</span>
            <span className={styles.label}>{itemMap[id] ?? id}</span>
            {!readOnly && (
              <div className={styles.controls} aria-label="Reorder buttons">
                <button
                  className={styles.moveBtn}
                  onClick={() => move(index, 'up')}
                  disabled={index === 0}
                  aria-label={`Move "${itemMap[id]}" up`}
                >
                  ↑
                </button>
                <button
                  className={styles.moveBtn}
                  onClick={() => move(index, 'down')}
                  disabled={index === order.length - 1}
                  aria-label={`Move "${itemMap[id]}" down`}
                >
                  ↓
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
