import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSidebarCollapseContext } from '@/hooks/useSidebarCollapse'
import { ROUTES } from '@/lib/constants'
import styles from './Sidebar.module.css'

interface NavItem {
  to: string
  label: string
  icon: string
}

const ADMIN_NAV: NavItem[] = [
  { to: ROUTES.ADMIN, label: 'Dashboard', icon: '⬡' },
  { to: ROUTES.ADMIN_USERS, label: 'Users', icon: '◎' },
  { to: ROUTES.ADMIN_SESSIONS, label: 'Sessions', icon: '◫' },
  { to: ROUTES.ADMIN_TESTIMONIALS, label: 'Testimonials', icon: '✦' },
]

const FACILITATOR_NAV: NavItem[] = [
  { to: ROUTES.FACILITATOR, label: 'Dashboard', icon: '⬡' },
  { to: ROUTES.FACILITATOR_TESTIMONIALS, label: 'Testimonials', icon: '✦' },
]

const PARTICIPANT_NAV: NavItem[] = [
  { to: ROUTES.COURSE, label: 'My Course', icon: '◈' },
  { to: ROUTES.COURSE_HISTORY, label: 'History', icon: '◷' },
]

const NAV_MAP = {
  admin: ADMIN_NAV,
  facilitator: FACILITATOR_NAV,
  participant: PARTICIPANT_NAV,
}

export function Sidebar() {
  const { profile } = useAuth()
  const { collapsed, toggle } = useSidebarCollapseContext()
  const role = profile?.role ?? 'participant'
  const items = NAV_MAP[role] ?? PARTICIPANT_NAV

  return (
    <aside
      id="primary-sidebar"
      className={styles.sidebar}
      data-collapsed={collapsed}
      aria-label="Main navigation"
    >
      <div className={styles.brand}>
        <span className={styles.brandMark}>PSP™</span>
        <button
          type="button"
          className={styles.toggle}
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="primary-sidebar"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span aria-hidden="true">{collapsed ? '›' : '‹'}</span>
        </button>
      </div>
      <nav className={styles.nav}>
        <ul role="list">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === ROUTES.ADMIN || item.to === ROUTES.FACILITATOR || item.to === ROUTES.COURSE}
                className={({ isActive }) =>
                  [styles.navLink, isActive ? styles.active : ''].join(' ')
                }
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
              >
                <span className={styles.icon} aria-hidden="true">{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.footer}>
        <span className={styles.rolePill}>{role}</span>
      </div>
    </aside>
  )
}
