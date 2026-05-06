import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProgress } from '@/hooks/useProgress'
import { PageShell } from '@/components/layout/PageShell'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import type { Section } from '@/types/database'
import styles from './CourseHome.module.css'

export default function CourseHome() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [sections, setSections] = useState<Section[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)

  const { progress, loading: progressLoading } = useProgress({
    participantId: profile?.id ?? '',
  })

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('sections')
      .select('*')
      .order('order_index')
      .then(({ data }) => {
        setSections(data ?? [])
        setSectionsLoading(false)
      })
  }, [profile?.id])

  // Resume position redirect on mount
  useEffect(() => {
    if (!profile?.id) return
    supabase
      .rpc('get_resume_position', { p_participant_id: profile.id, p_session_id: null })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const { section_slug } = data[0]
          navigate(`/course/${section_slug}`, { replace: false })
        }
      })
  }, [profile?.id, navigate])

  const progressMap = Object.fromEntries(
    progress.map((p) => [p.section_id, p])
  )

  const overallPct = sections.length > 0
    ? Math.round(
        progress.reduce((sum, p) => sum + (p.completed_exercises / Math.max(p.total_exercises, 1)) * 100, 0)
        / sections.length
      )
    : 0

  if (sectionsLoading || progressLoading) {
    return (
      <PageShell title="My Course">
        <div className={styles.loading}><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  return (
    <PageShell title="My Course">
      <div className={styles.header}>
        <div>
          <h2 className={styles.greeting}>Welcome, {profile?.display_name}</h2>
          <p className={styles.subtitle}>
            Personal Strategic Planning™ — Your five-filter journey
          </p>
        </div>
        <div className={styles.overallProgress}>
          <ProgressRing pct={overallPct} size={72} strokeWidth={5} label="Overall progress" />
          <span className={styles.overallLabel}>Overall</span>
        </div>
      </div>

      <div className={styles.grid}>
        {sections.map((section) => {
          const prog = progressMap[section.id]
          const completed = prog?.completed_exercises ?? 0
          const total = prog?.total_exercises ?? 0
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0
          const isDone = prog?.section_completed_at != null

          return (
            <button
              key={section.id}
              className={`${styles.card} ${isDone ? styles.cardDone : ''}`}
              onClick={() => navigate(`/course/${section.slug}`)}
              aria-label={`${section.title} — ${pct}% complete`}
            >
              <div className={styles.cardTop}>
                <ProgressRing pct={pct} size={52} strokeWidth={4} />
                {isDone && <Badge variant="success">Complete</Badge>}
              </div>
              <h3 className={styles.cardTitle}>{section.title}</h3>
              {section.subtitle && (
                <p className={styles.cardSubtitle}>{section.subtitle}</p>
              )}
              <p className={styles.cardProgress}>{completed}/{total} exercises</p>
            </button>
          )
        })}
      </div>

      <p className={styles.attribution}>
        Personal Strategic Planning™ — © Sam Koshy / Compass Career Life Solutions, Canada. All rights reserved.
        Workshop facilitated by Bijo Abraham (Career &amp; Life Strategist), Select HR Solutions.
      </p>
    </PageShell>
  )
}
