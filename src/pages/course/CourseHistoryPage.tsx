import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import styles from './CourseHistoryPage.module.css'

interface HistoryEntry {
  sessionId: string | null
  sessionTitle: string
  facilitatorName: string
  enrolledAt: string
  completionDate: string | null
}

export default function CourseHistoryPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return

    async function load() {
      // Session-based enrollments
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select(`
          id, enrolled_at, session_id,
          session:sessions!session_id(title, facilitator:profiles!facilitator_id(display_name))
        `)
        .eq('participant_id', profile!.id)
        .eq('is_active', true)
        .order('enrolled_at', { ascending: false })

      const entries: HistoryEntry[] = (enrollmentData ?? []).map((e) => {
        const session = e.session as { title: string; facilitator: { display_name: string } } | null
        return {
          sessionId: e.session_id,
          sessionTitle: session?.title ?? 'Unnamed Session',
          facilitatorName: session?.facilitator?.display_name ?? 'Unknown',
          enrolledAt: e.enrolled_at,
          completionDate: null,
        }
      })

      // Self-paced progress (session_id IS NULL) — participants working without
      // a facilitator session have no enrollment record, so we synthesise an
      // entry from their progress rows instead.
      const { data: selfPacedRows } = await supabase
        .from('progress')
        .select('last_activity_at, section_completed_at')
        .eq('participant_id', profile!.id)
        .is('session_id', null)
        .order('last_activity_at', { ascending: true })

      if (selfPacedRows && selfPacedRows.length > 0) {
        const startedAt = selfPacedRows[0].last_activity_at
        const allComplete = selfPacedRows.every((r) => r.section_completed_at !== null)
        const latestActivity = selfPacedRows[selfPacedRows.length - 1]?.last_activity_at ?? startedAt
        entries.unshift({
          sessionId: null,
          sessionTitle: 'Self-Paced Journey',
          facilitatorName: 'Independent',
          enrolledAt: startedAt,
          completionDate: allComplete ? latestActivity : null,
        })
      }

      setHistory(entries)
      setLoading(false)
    }

    load()
  }, [profile?.id])

  if (loading) {
    return (
      <PageShell title="Course History">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <Spinner size="lg" />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Course History">
      {history.length === 0 ? (
        <div className={styles.empty}>
          <p>No past sessions yet. Complete a session to see your history here.</p>
          <button className={styles.cta} onClick={() => navigate('/course')}>
            Go to My Course
          </button>
        </div>
      ) : (
        <ul className={styles.list}>
          {history.map((entry) => (
            <li key={`${entry.sessionId}-${entry.enrolledAt}`} className={styles.item}>
              <div className={styles.info}>
                <h3 className={styles.title}>{entry.sessionTitle}</h3>
                <p className={styles.meta}>
                  Facilitated by {entry.facilitatorName} ·{' '}
                  Enrolled {new Date(entry.enrolledAt).toLocaleDateString()}
                </p>
              </div>
              <div className={styles.right}>
                <Badge variant={entry.completionDate ? 'success' : 'muted'}>
                  {entry.completionDate ? 'Completed' : 'In Progress'}
                </Badge>
                <button
                  className={styles.viewBtn}
                  onClick={() =>
                    navigate(
                      entry.sessionId
                        ? `/course/personality?session=${entry.sessionId}`
                        : '/course'
                    )
                  }
                >
                  Review →
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  )
}
