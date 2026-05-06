import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import styles from './PageShell.module.css'

interface PageShellProps {
  children: ReactNode
  title?: string
}

export function PageShell({ children, title }: PageShellProps) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <TopBar title={title} />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  )
}
