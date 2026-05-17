import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { SessionCreateModal } from './SessionCreateModal'
import styles from './SessionsPage.module.css'

interface SessionRow {
  id: string
  title: string
  scheduled_start: string | null
  scheduled_end: string | null
  is_active: boolean
  facilitator_name: string
  enrollment_count: number
}

export default function SessionsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('sessions')
      .select(`
        id, title, scheduled_start, scheduled_end, is_active,
        facilitator:profiles!facilitator_id(display_name),
        enrollments(count)
      `)
      .order('created_at', { ascending: false })

    const rows: SessionRow[] = (data ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      scheduled_start: s.scheduled_start,
      scheduled_end: s.scheduled_end,
      is_active: s.is_active,
      facilitator_name: (s.facilitator as { display_name: string } | null)?.display_name ?? 'Unassigned',
      enrollment_count: (s.enrollments as Array<{ count: number }>)?.[0]?.count ?? 0,
    }))

    setSessions(rows)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <PageShell title="Sessions">
        <div className={styles.loading}><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Sessions">
      <div className={styles.toolbar}>
        <p className={styles.count}>{sessions.length} sessions</p>
        <Button onClick={() => setShowCreate(true)}>New Session</Button>
      </div>

      {sessions.length === 0 ? (
        <div className={styles.empty}>
          <p>No sessions yet. Create a session to get started.</p>
          <Button onClick={() => setShowCreate(true)}>Create Session</Button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Facilitator</th>
                <th>Dates</th>
                <th>Participants</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className={styles.title}>{s.title}</td>
                  <td>{s.facilitator_name}</td>
                  <td className={styles.dates}>
                    {s.scheduled_start
                      ? `${new Date(s.scheduled_start).toLocaleDateString()} – ${s.scheduled_end ? new Date(s.scheduled_end).toLocaleDateString() : '…'}`
                      : 'Undated'}
                  </td>
                  <td>{s.enrollment_count}</td>
                  <td><Badge variant={s.is_active ? 'success' : 'muted'}>{s.is_active ? 'Active' : 'Archived'}</Badge></td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/sessions/${s.id}`)}>
                      Manage →
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <SessionCreateModal
          adminId={profile!.id}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </PageShell>
  )
}
