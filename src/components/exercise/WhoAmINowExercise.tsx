import { useState, useEffect, useRef, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useExerciseSave } from '@/hooks/useExerciseSave'
import styles from './WhoAmINowExercise.module.css'

interface WhoAmINowResponse {
  rows: string[][]
}

interface WhoAmINowProps {
  exerciseId: string
  initialResponse?: WhoAmINowResponse | null
  participantId: string
  sessionId?: string | null
  readOnly?: boolean
}

const DEFAULT_COUNT = 10

/**
 * Parse saved rows into { items, order }.
 *
 * New format: row = [rank, text, id]  — restores both text and drag order.
 * Old format: row = [rank, text]      — restores text only, order resets to id order.
 */
function parseRows(
  rows: string[][],
  ids: string[]
): { items: Record<string, string>; order: string[] } {
  const empty = Object.fromEntries(ids.map((id) => [id, '']))
  if (!rows.length) return { items: empty, order: [...ids] }

  if (rows[0].length >= 3) {
    const idSet = new Set(ids)
    const nextOrder: string[] = []
    const nextItems = { ...empty }
    for (const row of rows) {
      const id = String(row[2])
      if (idSet.has(id)) {
        nextOrder.push(id)
        nextItems[id] = String(row[1] ?? '')
      }
    }
    if (nextOrder.length === ids.length) return { items: nextItems, order: nextOrder }
  }

  // Old format: positional — can't restore drag order
  return {
    items: Object.fromEntries(ids.map((id, i) => [id, String((rows[i] ?? [])[1] ?? '')])),
    order: [...ids],
  }
}

function SortableRow({ id, index, value, onChange, readOnly }: {
  id: string
  index: number
  value: string
  onChange: (id: string, v: string) => void
  readOnly?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} className={styles.row} {...attributes}>
      <div className={styles.rank}>{index + 1}.</div>
      <textarea
        className={styles.input}
        value={value}
        placeholder="I am..."
        disabled={readOnly}
        onChange={(e) => onChange(id, e.target.value)}
        rows={2}
        aria-label={`Who am I statement ${index + 1}`}
      />
      <div className={styles.handle} aria-hidden {...listeners}>
        ⋮⋮
      </div>
    </li>
  )
}

export function WhoAmINowExercise({ exerciseId, initialResponse, participantId, sessionId, readOnly = false }: WhoAmINowProps) {
  const ids = useMemo(() => Array.from({ length: DEFAULT_COUNT }, (_, i) => `who-${i}`), [])

  // Capture the response available at mount time for the lazy state initializers.
  // Using a ref prevents the initializer closures from going stale.
  const initialResponseRef = useRef(initialResponse)

  const [order, setOrder] = useState<string[]>(() =>
    parseRows((initialResponseRef.current?.rows ?? []) as string[][], ids).order
  )
  const [items, setItems] = useState<Record<string, string>>(() =>
    parseRows((initialResponseRef.current?.rows ?? []) as string[][], ids).items
  )

  // One-shot sync: handle the async case where initialResponse is null on mount
  // but arrives shortly after (data loads after component renders).
  // We deliberately do NOT re-sync on every initialResponse change — doing so
  // would remap item texts to wrong IDs whenever an optimistic save round-trips
  // back through SectionPage's localUpdate → responses → initialResponse prop.
  const syncedRef = useRef((initialResponseRef.current?.rows?.length ?? 0) > 0)
  useEffect(() => {
    if (syncedRef.current) return
    const rows = (initialResponse?.rows ?? []) as string[][]
    if (!rows.length) return
    syncedRef.current = true
    const parsed = parseRows(rows, ids)
    setOrder(parsed.order)
    setItems(parsed.items)
  }, [initialResponse, ids])

  const { save } = useExerciseSave({ exerciseId, participantId, sessionId })

  function persist(nextOrder: string[], nextItems: Record<string, string>, complete?: boolean) {
    // row = [rank, text, id] — id in position 2 lets parseRows restore drag
    // order correctly on page reload without remapping texts to wrong IDs.
    const rows = nextOrder.map((id, idx) => [String(idx + 1), nextItems[id] ?? '', id])
    const anyFilled = rows.some((r) => String(r[1]).trim() !== '')
    save({ rows }, complete ?? anyFilled)
  }

  function handleChange(id: string, value: string) {
    if (readOnly) return
    const next = { ...items, [id]: value }
    setItems(next)
    persist(order, next)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = order.indexOf(String(active.id))
    const newIndex = order.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(order, oldIndex, newIndex)
    setOrder(next)
    persist(next, items, true)
  }

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>
        Write 10 separate short statements that answer the question 'Who am I?' Then drag and drop them to rank according to importance to YOU.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className={styles.list} role="list">
            {order.map((id, idx) => (
              <SortableRow key={id} id={id} index={idx} value={items[id] ?? ''} onChange={handleChange} readOnly={readOnly} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}

export default WhoAmINowExercise
