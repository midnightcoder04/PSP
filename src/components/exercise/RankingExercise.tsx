import { useState, useEffect, useMemo, useRef } from 'react'
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

interface DerivedRankingData {
  order: string[]
  /** Dynamically-derived items; null means use content.items as-is. */
  items: { id: string; label: string }[] | null
  metrics: Record<string, number> | null
  metricLabel: string | null
  metricFormat: 'count' | 'currency' | null
  /** Only the first N items in order are persisted; null = no limit. */
  recordLimit: number | null
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

const GOAL_INVENTORY_GOAL_COL = 1  // "Specific Goal" column index

function computeDerivedOrder(
  content: RankingContent,
  derivesFromResponse: Response | null | undefined
): DerivedRankingData {
  // goal_inventory_rows: derive draggable items from the Life Goal Inventory table response.
  if (content.derives_from?.group_by === 'goal_inventory_rows') {
    const payload = derivesFromResponse?.response_json as { rows?: string[][] } | null | undefined
    const rows = payload?.rows ?? []
    const filledGoals = rows
      .map((row, idx) => ({
        id: `goal_row_${idx}`,
        label: (row[GOAL_INVENTORY_GOAL_COL] ?? '').trim(),
      }))
      .filter((item) => item.label !== '')
    return {
      order: filledGoals.map((item) => item.id),
      items: filledGoals,
      metrics: null,
      metricLabel: null,
      metricFormat: null,
      recordLimit: 10,
    }
  }

  if (!content.derives_from || content.derives_from.group_by !== 'id_prefix') {
    if (content.derives_from?.group_by !== 'values_pair_sum') {
      return { order: content.items.map((i) => i.id), items: null, metrics: null, metricLabel: null, metricFormat: null, recordLimit: null }
    }
  }

  if (content.derives_from?.group_by === 'values_pair_sum') {
    const payload = derivesFromResponse?.response_json as
      | { rows?: string[][] }
      | null
      | undefined
    const rows = payload?.rows ?? []
    const pairCount = content.items.length
    const orderIndex = new Map(content.items.map((item, index) => [item.id, index]))
    const metrics = Object.fromEntries(
      content.items.map((item, index) => {
        const firstRow = rows[index] ?? []
        const secondRow = rows[index + pairCount] ?? []
        const parse = (value: string | undefined) => {
          const cleaned = String(value ?? '').replace(/[\s,$]/g, '')
          const parsed = parseFloat(cleaned)
          return Number.isFinite(parsed) ? parsed : 0
        }
        const total = parse(firstRow[firstRow.length - 1]) + parse(secondRow[secondRow.length - 1])
        return [item.id, total]
      })
    ) as Record<string, number>
    const order = [...content.items]
      .map((item) => item.id)
      .sort((left, right) => {
        const diff = (metrics[right] ?? 0) - (metrics[left] ?? 0)
        if (diff !== 0) return diff
        return (orderIndex.get(left) ?? 0) - (orderIndex.get(right) ?? 0)
      })
    return { order, items: null, metrics, metricLabel: 'Spent', metricFormat: 'currency', recordLimit: null }
  }

  const payload = derivesFromResponse?.response_json as
    | { selected_ids?: string[]; checked?: string[] }
    | null
    | undefined
  // CheckboxExercise persists `selected_ids`; older payloads used `checked`.
  // Reading both keeps the count badge live as the participant ticks options
  // upstream (005-iter5 / FR-040 follow-up).
  const checked = payload?.selected_ids ?? payload?.checked ?? []
  const counts = deriveWatusiCounts(checked)
  const derivedOrder = watusiOrderFromCounts(counts)
  const itemIds = new Set(content.items.map((i) => i.id))
  // Only keep ids that exist in this exercise's items; preserve derived order.
  return {
    order: derivedOrder.filter((id) => itemIds.has(id)),
    items: null,
    metrics: counts as unknown as Record<string, number>,
    metricLabel: 'Count',
    metricFormat: 'count',
    recordLimit: null,
  }
}

function metricForItemId(
  itemId: string,
  metrics: Record<string, number> | null
): number | null {
  if (!metrics) return null
  if (itemId in metrics) return metrics[itemId]
  // attitude_w → key "w"
  const parts = itemId.split('_')
  const key = parts[parts.length - 1]
  if (key in metrics) return metrics[key as keyof typeof metrics]
  return null
}

function formatMetricValue(value: number, metricFormat: DerivedRankingData['metricFormat']): string {
  if (metricFormat === 'currency') {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  return String(value)
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
      {showCount && count != null && count > 0 && (
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

  // Merge saved top-N with all derived items so items added to the inventory
  // after the first save still appear below the recorded boundary.
  function mergeWithDerived(saved: string[], allDerived: string[]): string[] {
    const savedSet = new Set(saved)
    const validSaved = saved.filter((id) => allDerived.includes(id))
    const remaining = allDerived.filter((id) => !savedSet.has(id))
    return [...validSaved, ...remaining]
  }

  // Initial order: merge saved top-N with full derived list > derived list > content items.
  const [order, setOrder] = useState<string[]>(() => {
    if (initialResponse?.order?.length && derived.items) {
      return mergeWithDerived(initialResponse.order, derived.order)
    }
    if (initialResponse?.order?.length) return initialResponse.order
    if (derived.order.length) return derived.order
    return content.items.map((i) => i.id)
  })

  useEffect(() => {
    if (initialResponse?.order?.length && derived.items) {
      setOrder(mergeWithDerived(initialResponse.order, derived.order))
      return
    }
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
  const effectiveItems = derived.items ?? content.items
  const itemMap = Object.fromEntries(effectiveItems.map((i) => [i.id, i.label]))

  // 006-iter6 / US1 (T016): auto-complete-on-mount for the read-only sorted
  // branch. Persist {order: derived, is_complete: true} exactly once when
  // there is no prior response. Subsequent renders skip — the persisted
  // response will rehydrate via initialResponse on the next page load.
  const sortedAutoSaveFired = useRef(false)
  useEffect(() => {
    if (interaction !== 'sorted') return
    if (readOnly) return
    if (initialResponse?.order?.length) return
    if (sortedAutoSaveFired.current) return
    if (derived.order.length === 0) return
    sortedAutoSaveFired.current = true
    save({ order: derived.order }, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interaction, readOnly, initialResponse, derived.order.join(',')])

  const sortedOrder = interaction === 'sorted' ? derived.order : order

  function persist(nextOrder: string[]) {
    const toSave =
      derived.recordLimit != null ? nextOrder.slice(0, derived.recordLimit) : nextOrder
    save({ order: toSave }, true)
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

  // 006-iter6 / US1 (T015): read-only sorted listing branch.
  // No drag, no buttons, no # rank column. Rows in derived order; count chip
  // pinned right via CSS margin-left:auto. Auto-complete-on-mount handled
  // in the useEffect above.
  if (interaction === 'sorted') {
    const summaryCounts = derived.metricFormat === 'count' ? derived.metrics : null
    return (
      <div className={styles.container}>
        <p className={styles.prompt}>{content.prompt}</p>
        {showCounts && summaryCounts && content.derives_from?.group_by === 'id_prefix' && (
          <div className={styles.countSummary} aria-label="WATUSI counts summary">
            {Object.entries(summaryCounts)
              .filter(([, count]) => count > 0)
              .sort((a, b) => {
                const order = ['w', 'a', 't', 'u', 's', 'i']
                return order.indexOf(a[0]) - order.indexOf(b[0])
              })
              .map(([group, count]) => (
                <span key={group} className={styles.summaryChip}>
                  <span className={styles.summaryKey}>{group.toUpperCase()}</span>
                  <span className={styles.summaryValue}>{count}</span>
                </span>
              ))}
          </div>
        )}
        <ol className={`${styles.list} ${styles.sortedList}`} role="list">
          {sortedOrder.map((id) => {
            const metric = metricForItemId(id, derived.metrics)
            const label = itemMap[id] ?? id
            return (
              <li
                key={id}
                className={`${styles.item} ${styles.sortedItem}`}
                role="listitem"
                aria-label={
                  metric != null && metric > 0
                    ? `${label}, ${derived.metricLabel?.toLowerCase() ?? 'value'} ${formatMetricValue(metric, derived.metricFormat)}`
                    : label
                }
              >
                <span className={styles.label}>{label}</span>
                {showCounts && metric != null && metric > 0 && (
                  <span
                    className={styles.countBadge}
                    aria-label={`${derived.metricLabel ?? 'Count'}: ${formatMetricValue(metric, derived.metricFormat)}`}
                  >
                    {formatMetricValue(metric, derived.metricFormat)}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{content.prompt}</p>

      {interaction === 'drag' && derived.items != null && derived.items.length === 0 ? (
        <p className={styles.emptyState}>
          Fill in your Life Goal Inventory above to see your goals here.
        </p>
      ) : interaction === 'drag' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ol className={styles.list}>
              {order.map((id, index) => (
                <>
                  <SortableItem
                    key={id}
                    id={id}
                    rank={index + 1}
                    label={itemMap[id] ?? id}
                    count={metricForItemId(id, derived.metrics)}
                    showCount={showCounts}
                  />
                  {derived.recordLimit != null && index === derived.recordLimit - 1 && order.length > derived.recordLimit && (
                    <li key="__limit__" className={styles.recordLimitDivider} aria-hidden="true">
                      Top {derived.recordLimit} recorded · drag up to promote
                    </li>
                  )}
                </>
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      ) : (
        <ol className={styles.list}>
          {order.map((id, index) => {
            const count = metricForItemId(id, derived.metrics)
            return (
              <li key={id} className={styles.item}>
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.label}>{itemMap[id] ?? id}</span>
                {showCounts && count != null && count > 0 && (
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
