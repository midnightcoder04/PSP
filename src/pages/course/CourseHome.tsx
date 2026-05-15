import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProgress } from '@/hooks/useProgress'
import { useSectionLock } from '@/hooks/useSectionLock'
import { PageShell } from '@/components/layout/PageShell'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { LockIcon } from '@/components/ui/LockIcon'
import type { Section, Progress } from '@/types/database'
import styles from './CourseHome.module.css'

export default function CourseHome() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [sections, setSections] = useState<Section[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [resumeSlug, setResumeSlug] = useState<string | null>(null)

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

  const progressMap = useMemo(() => {
    const m = new Map<string, Progress>()
    for (const p of progress) m.set(p.section_id, p)
    return m
  }, [progress])

  const locks = useSectionLock({ sections, progressMap })

  // Resolve a resume target without auto-navigating. We surface a "Continue"
  // CTA so the participant can always see the full 6-section overview first.
  useEffect(() => {
    if (!profile?.id) return
    supabase
      .rpc('get_resume_position', { p_participant_id: profile.id, p_session_id: null })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const { section_slug } = data[0]
          const target = locks.find((l) => l.section.slug === section_slug)
          if (target && !target.isLocked) {
            setResumeSlug(section_slug)
            return
          }
        }
        setResumeSlug(null)
      })
  }, [profile?.id, locks])

  const resumeTitle = resumeSlug
    ? locks.find((l) => l.section.slug === resumeSlug)?.section.title ?? null
    : null
  const hasAnyProgress = progress.some((p) => p.completed_exercises > 0)

  const overallPct =
    sections.length > 0
      ? Math.round(
          progress.reduce(
            (sum, p) => sum + (p.completed_exercises / Math.max(p.total_exercises, 1)) * 100,
            0
          ) / sections.length
        )
      : 0

  if (sectionsLoading || progressLoading) {
    return (
      <PageShell title="My Course">
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
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

      {resumeSlug && (
        <div className={styles.continueRow}>
          <button
            type="button"
            className={styles.continueBtn}
            onClick={() => navigate(`/course/${resumeSlug}`)}
          >
            {hasAnyProgress ? 'Continue' : 'Start'}
            {resumeTitle ? ` — ${resumeTitle}` : ''} →
          </button>
        </div>
      )}

      <div className={styles.grid}>
        {locks.map(({ section, isLocked, prereqTitle }) => {
          const prog = progressMap.get(section.id)
          const completed = prog?.completed_exercises ?? 0
          const total = prog?.total_exercises ?? 0
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0
          const isDone = prog?.section_completed_at != null

          const ariaLabel = isLocked
            ? `Locked — complete ${prereqTitle} first`
            : `${section.title} — ${pct}% complete`

          if (isLocked) {
            return (
              <div
                key={section.id}
                className={`${styles.card} ${styles.cardLocked}`}
                data-locked="true"
                role="group"
                aria-label={ariaLabel}
                tabIndex={0}
                title={`Complete ${prereqTitle} first`}
              >
                <div className={styles.cardTop}>
                  <LockIcon size={24} aria-label="Locked" />
                </div>
                <h3 className={styles.cardTitle}>{section.title}</h3>
                {section.subtitle && <p className={styles.cardSubtitle}>{section.subtitle}</p>}
                <p className={styles.cardProgress}>
                  Locked — complete {prereqTitle} first
                </p>
              </div>
            )
          }

          return (
            <button
              key={section.id}
              className={`${styles.card} ${isDone ? styles.cardDone : ''}`}
              data-locked="false"
              onClick={() => navigate(`/course/${section.slug}`)}
              aria-label={ariaLabel}
            >
              <div className={styles.cardTop}>
                <ProgressRing pct={pct} size={52} strokeWidth={4} />
                {isDone && <Badge variant="success">Complete</Badge>}
              </div>
              <h3 className={styles.cardTitle}>{section.title}</h3>
              {section.subtitle && <p className={styles.cardSubtitle}>{section.subtitle}</p>}
              <p className={styles.cardProgress}>
                {completed}/{total} exercises
              </p>
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
