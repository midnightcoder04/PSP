import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import type { Profile } from '@/types/database'
import { UserCreateModal } from './UserCreateModal'
import { DeleteUserModal } from './DeleteUserModal'
import styles from './UsersPage.module.css'

type RoleFilter   = 'all' | 'admin' | 'facilitator' | 'participant'
type StatusFilter = 'all' | 'active' | 'inactive'

interface SessionInfo {
  session_id: string
  session_title: string
  session_active: boolean
  enrollment_active: boolean
}

interface ProfileWithSession extends Profile {
  sessionInfo: SessionInfo | null
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<ProfileWithSession[]>([])
  const [loading, setLoading]   = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProfileWithSession | null>(null)

  // Filters
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter]     = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select(`
        *,
        enrollments!participant_id(
          is_active,
          session_id,
          sessions(id, title, is_active)
        )
      `)
      .order('created_at', { ascending: false })

    const rows: ProfileWithSession[] = (data ?? []).map((p) => {
      const enrollments = (p.enrollments ?? []) as Array<{
        is_active: boolean
        session_id: string
        sessions: { id: string; title: string; is_active: boolean } | null
      }>
      // Pick the most recent active enrollment, or any enrollment if none active
      const active = enrollments.find((e) => e.is_active && e.sessions)
      const any    = enrollments.find((e) => e.sessions)
      const enr    = active ?? any ?? null
      return {
        ...p,
        sessionInfo: enr?.sessions
          ? {
              session_id: enr.sessions.id,
              session_title: enr.sessions.title,
              session_active: enr.sessions.is_active,
              enrollment_active: enr.is_active,
            }
          : null,
      }
    })

    setProfiles(rows)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(id: string, current: boolean) {
    setToggling(id)
    await supabase
      .from('profiles')
      .update({ is_active: !current, updated_at: new Date().toISOString() })
      .eq('id', id)
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p))
    )
    setToggling(null)
  }

  function sessionLabel(p: ProfileWithSession) {
    if (p.role !== 'participant') return null
    const { sessionInfo } = p
    if (!sessionInfo || !sessionInfo.enrollment_active) {
      return <span className={styles.sessionNone}>No session</span>
    }
    return (
      <span className={`${styles.sessionName} ${!sessionInfo.session_active ? styles.sessionArchived : ''}`}>
        {sessionInfo.session_title}
      </span>
    )
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return profiles.filter((p) => {
      if (roleFilter !== 'all' && p.role !== roleFilter) return false
      if (statusFilter === 'active'   && !p.is_active) return false
      if (statusFilter === 'inactive' &&  p.is_active) return false
      if (q && !p.display_name.toLowerCase().includes(q) && !p.email.toLowerCase().includes(q)) return false
      return true
    })
  }, [profiles, search, roleFilter, statusFilter])

  const activeCount   = profiles.filter((p) => p.is_active).length
  const inactiveCount = profiles.filter((p) => !p.is_active).length

  if (loading) {
    return (
      <PageShell title="Users">
        <div className={styles.loading}><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Users">
      <div className={styles.toolbar}>
        <p className={styles.count}>
          {activeCount} active · <span className={styles.countInactive}>{inactiveCount} inactive</span>
        </p>
        <Button onClick={() => setShowCreate(true)}>Add user</Button>
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.filterGroup}>
          {(['all', 'admin', 'facilitator', 'participant'] as RoleFilter[]).map((r) => (
            <button
              key={r}
              className={`${styles.filterBtn} ${roleFilter === r ? styles.filterBtnActive : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r === 'all' ? 'All roles' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.filterGroup}>
          {(['all', 'active', 'inactive'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              className={`${styles.filterBtn} ${statusFilter === s ? styles.filterBtnActive : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {profiles.length === 0
            ? <p>No users yet. Click <strong>Add user</strong> to create the first account.</p>
            : <p>No users match your filters.</p>}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <p className={styles.resultCount}>{filtered.length} of {profiles.length} users</p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Session</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={!p.is_active ? styles.inactive : ''}>
                  <td className={styles.name}>{p.display_name}</td>
                  <td className={styles.email}>{p.email}</td>
                  <td>
                    <Badge variant={p.role === 'admin' ? 'info' : p.role === 'facilitator' ? 'warning' : 'muted'}>
                      {p.role}
                    </Badge>
                  </td>
                  <td>{sessionLabel(p)}</td>
                  <td>
                    <Badge variant={p.is_active ? 'success' : 'error'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className={styles.date}>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className={styles.actions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={toggling === p.id}
                      onClick={() => toggleActive(p.id, p.is_active)}
                    >
                      {p.is_active ? 'Deactivate' : 'Reactivate'}
                    </Button>
                    <button
                      className={styles.deleteBtn}
                      style={p.is_active ? { visibility: 'hidden' } : undefined}
                      onClick={() => setDeleteTarget(p)}
                      title="Delete user permanently"
                      aria-label="Delete user permanently"
                      tabIndex={p.is_active ? -1 : 0}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate ? (
        <UserCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteUserModal
          userId={deleteTarget.id}
          displayName={deleteTarget.display_name}
          email={deleteTarget.email}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id))
            setDeleteTarget(null)
          }}
        />
      ) : null}
    </PageShell>
  )
}
