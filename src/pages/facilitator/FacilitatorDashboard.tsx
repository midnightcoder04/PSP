import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Spinner } from '@/components/ui/Spinner'
import { SessionCreateModal } from '@/pages/admin/SessionCreateModal'
import styles from './FacilitatorDashboard.module.css'

interface SessionCard {
  id: string
  title: string
  scheduled_start: string | null
  scheduled_end: string | null
  is_active: boolean
  enrollment_count: number
  overall_pct: number
}

export default function FacilitatorDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)

    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id, title, scheduled_start, scheduled_end, is_active')
      .eq('facilitator_id', profile.id)
      .order('created_at', { ascending: false })

    const cards: SessionCard[] = []
    for (const s of sessionData ?? []) {
      let overall_pct = 0
      const { data: stats } = await supabase.rpc('get_session_stats', { p_session_id: s.id })
      if (stats && stats.length > 0) {
        overall_pct = Math.round(
          stats.reduce((sum: number, p: { overall_pct: number }) => sum + (p.overall_pct ?? 0), 0) / stats.length
        )
      }

      cards.push({
        id: s.id,
        title: s.title,
        scheduled_start: s.scheduled_start,
        scheduled_end: s.scheduled_end,
        is_active: s.is_active,
        // get_session_stats only returns active enrollments, so its length is the correct count
        enrollment_count: stats?.length ?? 0,
        overall_pct,
      })
    }

    setSessions(cards)
    setLoading(false)
  }, [profile?.id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <PageShell title="My Sessions">
        <div className={styles.loading}><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  return (
    <PageShell title="My Sessions">
      <div className={styles.toolbar}>
        <p className={styles.count}>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
        <Button onClick={() => setShowCreate(true)}>New Session</Button>
      </div>

      {sessions.length === 0 ? (
        <div className={styles.empty}>
          <p>No sessions yet. Create one to get started.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {sessions.map((s) => (
            <div key={s.id} className={styles.card}>
              <div className={styles.cardTop}>
                <Badge variant={s.is_active ? 'success' : 'muted'}>
                  {s.is_active ? 'Active' : 'Archived'}
                </Badge>
                <ProgressRing pct={s.overall_pct} size={48} strokeWidth={4} label="Average completion" />
              </div>
              <h3 className={styles.cardTitle}>{s.title}</h3>
              <p className={styles.cardMeta}>
                {s.enrollment_count} participant{s.enrollment_count !== 1 ? 's' : ''} ·{' '}
                {s.scheduled_start ? new Date(s.scheduled_start).toLocaleDateString() : 'Undated'}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className={styles.viewBtn}
                onClick={() => navigate(`/facilitator/sessions/${s.id}`)}
              >
                View Progress →
              </Button>
            </div>
          ))}
        </div>
      )}

      {showCreate && profile && (
        <SessionCreateModal
          adminId={profile.id}
          lockedFacilitatorId={profile.id}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </PageShell>
  )
}
