import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSidebarCollapseContext } from '@/hooks/useSidebarCollapse'
import { Button } from '@/components/ui/Button'
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal'
import styles from './TopBar.module.css'

interface TopBarProps {
  title?: string
}

export function TopBar({ title }: TopBarProps) {
  const { profile, signOut } = useAuth()
  const { openMobile } = useSidebarCollapseContext()
  const [showChangePassword, setShowChangePassword] = useState(false)

  return (
    <>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.hamburger}
          onClick={openMobile}
          aria-label="Open navigation"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.right}>
          {profile && (
            <span className={styles.displayName}>{profile.display_name}</span>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowChangePassword(true)}>
            Change password
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      {showChangePassword ? (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      ) : null}
    </>
  )
}
