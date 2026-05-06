import type { ReactNode } from 'react'
import styles from './Badge.module.css'

interface BadgeProps {
  variant?: 'success' | 'info' | 'warning' | 'muted' | 'error'
  children: ReactNode
}

export function Badge({ variant = 'info', children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children}
    </span>
  )
}
