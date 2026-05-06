import { useEffect, useRef } from 'react'
import styles from './Toast.module.css'

interface ToastProps {
  message: string
  variant?: 'success' | 'error' | 'info'
  onDismiss: () => void
  duration?: number
}

export function Toast({ message, variant = 'info', onDismiss, duration = 3000 }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDismiss, duration])

  return (
    <div
      className={`${styles.toast} ${styles[variant]}`}
      role="alert"
      aria-live="polite"
    >
      <span>{message}</span>
      <button
        className={styles.dismiss}
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  )
}
