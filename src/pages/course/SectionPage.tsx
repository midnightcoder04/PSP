import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageShell } from '@/components/layout/PageShell'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Spinner } from '@/components/ui/Spinner'
import { CheckboxExercise } from '@/components/exercise/CheckboxExercise'
import { TextExercise } from '@/components/exercise/TextExercise'
import { RankingExercise } from '@/components/exercise/RankingExercise'
import { TableExercise } from '@/components/exercise/TableExercise'
import { InfoExercise } from '@/components/exercise/InfoExercise'
import { SectionOpening } from '@/components/section/SectionOpening'
import { SectionClosing } from '@/components/section/SectionClosing'
import { SECTION_SLUGS } from '@/lib/constants'
import type { Section, Exercise, Response } from '@/types/database'
import styles from './SectionPage.module.css'

interface SectionPageProps {
  readOnly?: boolean
}

export default function SectionPage({ readOnly = false }: SectionPageProps) {
  const { sectionSlug } = useParams<{ sectionSlug: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [section, setSection] = useState<Section | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [responses, setResponses] = useState<Record<string, Response>>({})
  const [loading, setLoading] = useState(true)

  const sessionId = null // TODO: wire session context in v2

  useEffect(() => {
    if (!sectionSlug || !profile?.id) return

    async function load() {
      setLoading(true)

      const [{ data: sec }, { data: exs }] = await Promise.all([
        supabase.from('sections').select('*').eq('slug', sectionSlug!).single(),
        supabase
          .from('exercises')
          .select('*')
          .eq('section_id', (await supabase.from('sections').select('id').eq('slug', sectionSlug!).single()).data?.id ?? '')
          .order('order_index'),
      ])

      if (!sec) { navigate('/course'); return }

      setSection(sec)
      setExercises(exs ?? [])

      if (exs && exs.length > 0) {
        const { data: resps } = await supabase
          .from('responses')
          .select('*')
          .eq('participant_id', profile!.id)
          .in('exercise_id', exs.map((e) => e.id))
          .is('session_id', null)

        const respMap: Record<string, Response> = {}
        for (const r of resps ?? []) {
          respMap[r.exercise_id] = r
        }
        setResponses(respMap)
      }

      setLoading(false)
    }

    load()
  }, [sectionSlug, profile?.id, navigate])

  const completed = exercises.filter((e) => responses[e.id]?.is_complete).length
  const total = exercises.filter((e) => e.type !== 'info').length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  if (loading) {
    return (
      <PageShell>
        <div className={styles.loading}><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  function renderExercise(exercise: Exercise) {
    const resp = responses[exercise.id]
    const commonProps = {
      exerciseId: exercise.id,
      participantId: profile!.id,
      sessionId,
      readOnly,
    }
    const content = exercise.content_json as unknown

    switch (exercise.type) {
      case 'checkbox':
        return (
          <CheckboxExercise
            {...commonProps}
            content={content as Parameters<typeof CheckboxExercise>[0]['content']}
            initialResponse={resp?.response_json as Parameters<typeof CheckboxExercise>[0]['initialResponse']}
          />
        )
      case 'text':
        return (
          <TextExercise
            {...commonProps}
            content={content as Parameters<typeof TextExercise>[0]['content']}
            initialResponse={resp?.response_json as Parameters<typeof TextExercise>[0]['initialResponse']}
          />
        )
      case 'ranking':
        return (
          <RankingExercise
            {...commonProps}
            content={content as Parameters<typeof RankingExercise>[0]['content']}
            initialResponse={resp?.response_json as Parameters<typeof RankingExercise>[0]['initialResponse']}
          />
        )
      case 'table':
        return (
          <TableExercise
            {...commonProps}
            content={content as Parameters<typeof TableExercise>[0]['content']}
            initialResponse={resp?.response_json as Parameters<typeof TableExercise>[0]['initialResponse']}
          />
        )
      case 'info':
        return (
          <InfoExercise
            content={content as Parameters<typeof InfoExercise>[0]['content']}
            attribution={exercise.attribution}
          />
        )
      default:
        return null
    }
  }

  return (
    <PageShell title={section?.title}>
      <div className={styles.progressBar}>
        <ProgressRing pct={pct} size={48} strokeWidth={4} />
        <span className={styles.progressLabel}>{completed} of {total} exercises complete</span>
      </div>

      {section?.subtitle && (
        <p className={styles.filterLabel}>{section.subtitle}</p>
      )}

      <SectionOpening framing={section?.framing ?? null} />

      <div className={styles.exerciseList}>
        {exercises.map((exercise, index) => (
          <section key={exercise.id} className={styles.exerciseCard} id={`exercise-${exercise.slug}`}>
            <div className={styles.exerciseHeader}>
              {exercise.type !== 'info' && (
                <span className={styles.exerciseNum}>{index + 1}</span>
              )}
              <h3 className={styles.exerciseTitle}>{exercise.title}</h3>
              {responses[exercise.id]?.is_complete && exercise.type !== 'info' && (
                <span className={styles.completedMark} aria-label="Completed">✓</span>
              )}
            </div>
            <div className={styles.exerciseBody}>
              {renderExercise(exercise)}
            </div>
          </section>
        ))}
      </div>

      <SectionClosing
        framing={section?.framing ?? null}
        nextSectionSlug={nextSectionSlug(sectionSlug)}
        showContinue={!readOnly}
      />

      <div className={styles.navButtons}>
        <button className={styles.backBtn} onClick={() => navigate('/course')}>
          ← Back to course
        </button>
      </div>
    </PageShell>
  )
}

function nextSectionSlug(currentSlug: string | undefined): string | null {
  if (!currentSlug) return null
  const idx = SECTION_SLUGS.indexOf(currentSlug as (typeof SECTION_SLUGS)[number])
  if (idx === -1 || idx === SECTION_SLUGS.length - 1) return null
  return SECTION_SLUGS[idx + 1]
}
