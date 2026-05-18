import { useState, useEffect, useMemo } from 'react'
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
  const defaultCount = 10
  // Parse initial rows into an items map: id -> text
  const initialRows = initialResponse?.rows ?? []
  const normalized = Array.from({ length: defaultCount }, (_, i) => {
    const saved = initialRows[i] ?? []
    // Expect saved format like ["1", "I am a parent"]
    return String(saved[1] ?? '')
  })

  const ids = useMemo(() => Array.from({ length: defaultCount }, (_, i) => `who-${i}`), [])
  const [order, setOrder] = useState<string[]>(ids)
  const [items, setItems] = useState<Record<string, string>>(() => Object.fromEntries(ids.map((id, i) => [id, normalized[i]])))

  useEffect(() => {
    // When initialResponse changes, adopt it
    const rows = initialResponse?.rows ?? []
    const next: Record<string, string> = {}
    ids.forEach((id, i) => {
      next[id] = String((rows[i] ?? [])[1] ?? '')
    })
    setItems(next)
    // Keep existing order unless initial response provided a different sequence
    // We intentionally do not reorder based on saved ranks here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialResponse])

  const { save } = useExerciseSave({ exerciseId, participantId, sessionId })

  function persist(nextOrder: string[], nextItems: Record<string, string>, complete?: boolean) {
    const rows = nextOrder.map((id, idx) => [String(idx + 1), nextItems[id] ?? ''])
    const anyFilled = rows.some((r) => r.some((c) => String(c).trim() !== ''))
    const payload: WhoAmINowResponse = { rows }
    save(payload, complete ?? anyFilled)
  }

  function handleChange(id: string, value: string) {
    if (readOnly) return
    const next = { ...items, [id]: value }
    setItems(next)
    persist(order, next)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    if (active.id === over.id) return
    const oldIndex = order.indexOf(String(active.id))
    const newIndex = order.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(order, oldIndex, newIndex)
    setOrder(next)
    // Persist and mark complete so slide gate can progress
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
