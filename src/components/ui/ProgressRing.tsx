import { useEffect, useRef } from 'react'
import styles from './ProgressRing.module.css'

interface ProgressRingProps {
  pct: number
  size?: number
  strokeWidth?: number
  label?: string
}

export function ProgressRing({
  pct,
  size = 60,
  strokeWidth = 4,
  label,
}: ProgressRingProps) {
  const circleRef = useRef<SVGCircleElement>(null)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, pct))

  useEffect(() => {
    const el = circleRef.current
    if (!el) return
    const offset = circumference - (clamped / 100) * circumference
    el.style.strokeDashoffset = String(offset)

    if (clamped >= 100) {
      el.classList.add(styles.complete)
    } else {
      el.classList.remove(styles.complete)
    }
  }, [clamped, circumference])

  return (
    <span
      className={styles.ring}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${clamped}% complete`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className={styles.track}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          ref={circleRef}
          className={styles.progress}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className={styles.label}>{clamped}%</span>
    </span>
  )
}
