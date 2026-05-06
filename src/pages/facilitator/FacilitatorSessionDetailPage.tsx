import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useRealtimeSession } from '@/hooks/useRealtimeSession'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Spinner } from '@/components/ui/Spinner'
import styles from './FacilitatorSessionDetailPage.module.css'

interface ParticipantRow {
  participant_id: string
  display_name: string
  overall_pct: number
  sections: Array<{ slug: string; completed: number; total: number; completed_at: string | null }>
}

interface SessionInfo {
  title: string
  scheduled_end: string | null
  is_active: boolean
}

export default function FacilitatorSessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [loading, setLoading] = useState(true)

  const isArchived = session
    ? !session.is_active || (session.scheduled_end ? new Date(session.scheduled_end) < new Date() : false)
    : false

  const loadStats = useCallback(async () => {
    if (!id) return
    const { data } = await supabase.rpc('get_session_stats', { p_session_id: id })
    setParticipants((data ?? []) as ParticipantRow[])
  }, [id])

  useEffect(() => {
    if (!id) return
    supabase
      .from('sessions')
      .select('title, scheduled_end, is_active')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setSession(data)
        setLoading(false)
      })
    loadStats()
  }, [id, loadStats])

  useRealtimeSession({
    sessionId: id ?? '',
    onUpdate: loadStats,
    enabled: !!id && !isArchived,
  })

  const sectionSlugs = participants[0]?.sections?.map((s) => s.slug) ?? []

  if (loading) {
    return (
      <PageShell title="Session">
        <div className={styles.loading}><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  return (
    <PageShell title={session?.title ?? 'Session'}>
      <div className={styles.header}>
        {isArchived && <Badge variant="muted">Session Archived</Badge>}
        {!isArchived && <Badge variant="success">Live</Badge>}
        <span className={styles.participantCount}>{participants.length} participants</span>
      </div>

      {participants.length === 0 ? (
        <div className={styles.empty}>No participants enrolled in this session yet.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Participant</th>
                <th>Overall</th>
                {sectionSlugs.map((slug) => (
                  <th key={slug} className={styles.sectionHeader}>
                    {slug.charAt(0).toUpperCase() + slug.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.participant_id}>
                  <td className={styles.name}>{p.display_name}</td>
                  <td>
                    <div className={styles.overallCell}>
                      <ProgressRing pct={p.overall_pct ?? 0} size={36} strokeWidth={3} />
                    </div>
                  </td>
                  {(p.sections ?? []).map((s) => {
                    const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
                    return (
                      <td key={s.slug} className={styles.sectionCell}>
                        <span className={pct === 100 ? styles.done : ''}>{pct}%</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  )
}
