import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useRealtimeSession } from '@/hooks/useRealtimeSession'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { BulkAddModal } from '@/components/admin/BulkAddModal'
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

const SECTION_LABELS: Record<string, string> = {
  'personality':                        'Personality',
  'attitude':                           'Attitude',
  'values':                             'Values',
  'roles-and-demands':                  'Roles & Demands',
  'transferable-skills':                'Transferable Skills',
  'specific-goals':                     'Specific Goals',
  'goal-impact-matrix':                 'Goal Impact',
  'visualization':                      'Visualization',
  'removing-obstacles-achieving-goals': 'Removing Obstacles',
}

const SECTION_ABBR: Record<string, string> = {
  'personality':                        'Personality',
  'attitude':                           'Attitudes',
  'values':                             'Values',
  'roles-and-demands':                  'Roles & Demands',
  'transferable-skills':                'Skills',
  'specific-goals':                     'Specific Goals',
  'goal-impact-matrix':                 'Goal Impact',
  'visualization':                      'Visualization',
  'removing-obstacles-achieving-goals': 'Obstacles',
}

function sectionLabel(slug: string) {
  return SECTION_LABELS[slug] ?? slug.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

function OverallPct({ pct }: { pct: number }) {
  const rounded = Math.round(pct ?? 0)
  const state = rounded >= 100 ? 'done' : rounded > 0 ? 'partial' : 'empty'
  return (
    <span className={styles.overallPill} data-state={state}>
      {rounded === 100 ? '✓ 100%' : `${rounded}%`}
    </span>
  )
}

function SectionStrip({ sections }: { sections: ParticipantRow['sections'] }) {
  const valid = sections.filter((s) => s.slug != null)
  return (
    <div className={styles.strip}>
      {valid.map((s) => {
        const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
        const state = pct === 100 ? 'done' : pct > 0 ? 'partial' : 'empty'
        const abbr = SECTION_ABBR[s.slug] ?? s.slug.slice(0, 2)
        return (
          <div
            key={s.slug}
            className={styles.segmentWrap}
            title={`${sectionLabel(s.slug)}: ${pct}%`}
          >
            <div className={styles.segment} data-state={state} />
            <span className={styles.segmentKey}>{abbr}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function FacilitatorSessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [maxBulkAdd, setMaxBulkAdd] = useState(10)
  const [showBulkAdd, setShowBulkAdd] = useState(false)

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
    // Fetch own max_bulk_add to determine if bulk-add UI should be shown
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData?.user) return
      supabase
        .from('profiles')
        .select('max_bulk_add')
        .eq('id', authData.user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) setMaxBulkAdd(profile.max_bulk_add ?? 10)
        })
    })
  }, [id, loadStats])

  useRealtimeSession({
    sessionId: id ?? '',
    onUpdate: loadStats,
    enabled: !!id && !isArchived,
  })

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
        {isArchived
          ? <Badge variant="muted">Session Archived</Badge>
          : <Badge variant="success">Live</Badge>}
        <span className={styles.participantCount}>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
        {!isArchived ? (
          <Button size="sm" variant="secondary" onClick={() => setShowBulkAdd(true)}>
            Add members
          </Button>
        ) : null}
      </div>

      {showBulkAdd ? (
        <BulkAddModal
          sessionId={id!}
          sessionTitle={session?.title ?? ''}
          maxBulkAdd={maxBulkAdd}
          onClose={() => setShowBulkAdd(false)}
          onAdded={() => { setShowBulkAdd(false); loadStats() }}
        />
      ) : null}

      {participants.length === 0 ? (
        <div className={styles.empty}>No participants enrolled in this session yet.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colParticipant}>Participant</th>
                <th className={styles.colOverall}>Overall</th>
                <th className={styles.colSections}>
                  Sections
                  <span className={styles.sectionLegend}>
                    <span data-state="done"    className={styles.legendDot} /> Done
                    <span data-state="partial" className={styles.legendDot} /> Partial
                    <span data-state="empty"   className={styles.legendDot} /> Not started
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.participant_id}>
                  <td className={styles.name}>{p.display_name}</td>
                  <td className={styles.overallCell}>
                    <OverallPct pct={p.overall_pct ?? 0} />
                  </td>
                  <td>
                    <SectionStrip sections={p.sections ?? []} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  )
}
