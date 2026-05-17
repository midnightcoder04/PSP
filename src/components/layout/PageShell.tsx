import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { SidebarCollapseContext, useSidebarCollapse } from '@/hooks/useSidebarCollapse'
import styles from './PageShell.module.css'

interface PageShellProps {
  children: ReactNode
  title?: string
}

export function PageShell({ children, title }: PageShellProps) {
  // 005-iter5-ux-fixes / US1: single source of truth for sidebar collapse;
  // Sidebar reads from this same context to keep markup + main-margin in sync.
  const collapseState = useSidebarCollapse()

  return (
    <SidebarCollapseContext.Provider value={collapseState}>
      <div className={styles.shell} data-sidebar-collapsed={collapseState.collapsed}>
        <Sidebar />
        <div className={styles.main}>
          <TopBar title={title} />
          <main className={styles.content}>
            {children}
          </main>
        </div>
      </div>
    </SidebarCollapseContext.Provider>
  )
}
