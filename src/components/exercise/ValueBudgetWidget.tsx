import styles from './ValueBudgetWidget.module.css'
import { useEffect, useRef, useState } from 'react'

interface ValueBudgetWidgetProps {
  budget: number
  spent: number
}

function formatCurrency(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export function ValueBudgetWidget({ budget, spent }: ValueBudgetWidgetProps) {
  const remaining = budget - spent
  let state: 'in-progress' | 'perfect' | 'over-budget' = 'in-progress'
  if (remaining === 0) state = 'perfect'
  else if (remaining < 0) state = 'over-budget'
  const ref = useRef<HTMLElement | null>(null)
  const startRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  // compute initial position after mount
  useEffect(() => {
    function compute() {
      const winW = window.innerWidth
      const winH = window.innerHeight
      const isMobile = winW <= 640
      const bottomOffset = isMobile ? 96 : 180
      const el = ref.current
      const rect = el?.getBoundingClientRect()
      const width = rect?.width || 180
      const height = rect?.height || 80
      const left = Math.max(8, Math.round((winW - width) / 2))
      const top = Math.max(8, Math.round(winH - bottomOffset - height))
      setPosition({ left, top })
    }
    // Wait a frame for layout
    requestAnimationFrame(compute)
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  function onPointerDown(e: React.PointerEvent) {
    const el = ref.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    pointerIdRef.current = e.pointerId
    startRef.current = { x: e.clientX, y: e.clientY, left: position?.left ?? 0, top: position?.top ?? 0 }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (pointerIdRef.current !== e.pointerId) return
    const start = startRef.current
    const el = ref.current
    if (!start || !el) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const rect = el.getBoundingClientRect()
    const winW = window.innerWidth
    const winH = window.innerHeight
    const newLeft = Math.min(Math.max(8, start.left + dx), Math.max(8, winW - rect.width - 8))
    const newTop = Math.min(Math.max(8, start.top + dy), Math.max(8, winH - rect.height - 8))
    setPosition({ left: newLeft, top: newTop })
  }

  function onPointerUp(e: React.PointerEvent) {
    const el = ref.current
    if (!el) return
    try {
      el.releasePointerCapture(e.pointerId)
    } catch {}
    pointerIdRef.current = null
    startRef.current = null
  }

  return (
    <aside
      ref={ref as any}
      className={styles.widget}
      data-state={state}
      role="status"
      aria-live="polite"
      aria-label={`Budget tracker — spent ${formatCurrency(spent)} of ${formatCurrency(budget)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={
        position
          ? { left: `${position.left}px`, top: `${position.top}px`, transform: 'none' as const }
          : undefined
      }
    >
      <div className={styles.line}>
        <span className={styles.label}>Spent</span>
        <span className={styles.value}>{formatCurrency(spent)}</span>
      </div>
      <div className={styles.line}>
        <span className={styles.label}>Remaining</span>
        <span className={styles.value}>{formatCurrency(remaining)}</span>
      </div>
      {state === 'perfect' && <p className={styles.hint}>Perfect — exactly on budget.</p>}
      {state === 'over-budget' && <p className={styles.hint}>Over budget — reduce a row to continue.</p>}
    </aside>
  )
}
