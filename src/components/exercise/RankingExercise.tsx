import { useState, useEffect, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useExerciseSave } from '@/hooks/useExerciseSave'
import {
  deriveWatusiCounts,
  watusiOrderFromCounts,
} from '@/hooks/useWatusiCounts'
import type { RankingContent, Response } from '@/types/database'
import styles from './RankingExercise.module.css'

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
  /**
   * The upstream exercise's response, when `content.derives_from` is set.
   * For WATUSI: the checklist response containing the participant's ticked items.
   */
  derivesFromResponse?: Response | null
}

function computeDerivedOrder(
  content: RankingContent,
  derivesFromResponse: Response | null | undefined
): { order: string[]; counts: Record<string, number> | null } {
  if (!content.derives_from || content.derives_from.group_by !== 'id_prefix') {
    return { order: content.items.map((i) => i.id), counts: null }
  }
  const payload = derivesFromResponse?.response_json as
    | { checked?: string[] }
    | null
    | undefined
  const checked = payload?.checked ?? []
  const counts = deriveWatusiCounts(checked)
  const derivedOrder = watusiOrderFromCounts(counts)
  const itemIds = new Set(content.items.map((i) => i.id))
  // Only keep ids that exist in this exercise's items; preserve derived order.
  return {
    order: derivedOrder.filter((id) => itemIds.has(id)),
    counts: counts as unknown as Record<string, number>,
  }
}

function countForItemId(
  itemId: string,
  counts: Record<string, number> | null
): number | null {
  if (!counts) return null
  // attitude_w → key "w"
  const parts = itemId.split('_')
  const key = parts[parts.length - 1]
  if (key in counts) return counts[key as keyof typeof counts]
  return null
}

interface SortableItemProps {
  id: string
  rank: number
  label: string
  count: number | null
  showCount: boolean
}

function SortableItem({ id, rank, label, count, showCount }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.item} ${styles.draggableItem}`}
      {...attributes}
      {...listeners}
    >
      <span className={styles.rank}>{rank}</span>
      <span className={styles.label}>{label}</span>
      {showCount && count != null && (
        <span className={styles.countBadge} aria-label={`Count: ${count}`}>
          {count}
        </span>
      )}
      <span className={styles.dragHandle} aria-hidden="true">⋮⋮</span>
    </li>
  )
}

export function RankingExercise({
  exerciseId,
  content,
  initialResponse,
  participantId,
  sessionId,
  readOnly = false,
  derivesFromResponse = null,
}: RankingExerciseProps) {
  const interaction = content.interaction ?? 'buttons'
  const showCounts = content.show_counts === true

  const derived = useMemo(
    () => computeDerivedOrder(content, derivesFromResponse),
    [content, derivesFromResponse]
  )

  // Initial order: existing saved order > derived prefilled order > content order.
  const [order, setOrder] = useState<string[]>(() => {
    if (initialResponse?.order?.length) return initialResponse.order
    if (derived.order.length) return derived.order
    return content.items.map((i) => i.id)
  })

  // If no saved order yet but derived order arrives later, adopt the derived order.
  useEffect(() => {
    if (initialResponse?.order?.length) {
      setOrder(initialResponse.order)
      return
    }
    if (derived.order.length) {
      setOrder(derived.order)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialResponse, derived.order.join(',')])

  const { save } = useExerciseSave({ exerciseId, participantId, sessionId })
  const itemMap = Object.fromEntries(content.items.map((i) => [i.id, i.label]))

  function persist(nextOrder: string[]) {
    save({ order: nextOrder }, true)
  }

  function move(index: number, direction: 'up' | 'down') {
    if (readOnly) return
    const next = [...order]
    const swap = direction === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setOrder(next)
    persist(next)
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    if (readOnly) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = order.indexOf(String(active.id))
    const newIndex = order.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(order, oldIndex, newIndex)
    setOrder(next)
    persist(next)
  }

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{content.prompt}</p>

      {interaction === 'drag' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ol className={styles.list}>
              {order.map((id, index) => (
                <SortableItem
                  key={id}
                  id={id}
                  rank={index + 1}
                  label={itemMap[id] ?? id}
                  count={countForItemId(id, derived.counts)}
                  showCount={showCounts}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      ) : (
        <ol className={styles.list}>
          {order.map((id, index) => {
            const count = countForItemId(id, derived.counts)
            return (
              <li key={id} className={styles.item}>
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.label}>{itemMap[id] ?? id}</span>
                {showCounts && count != null && (
                  <span className={styles.countBadge} aria-label={`Count: ${count}`}>
                    {count}
                  </span>
                )}
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
            )
          })}
        </ol>
      )}
    </div>
  )
}
