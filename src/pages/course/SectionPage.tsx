import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSlideState } from '@/hooks/useSlideState'
import { LocalResponseUpdateContext, type LocalResponseUpdater } from '@/hooks/useExerciseSave'
import { PageShell } from '@/components/layout/PageShell'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Spinner } from '@/components/ui/Spinner'
import { CheckboxExercise } from '@/components/exercise/CheckboxExercise'
import { TextExercise } from '@/components/exercise/TextExercise'
import { RankingExercise } from '@/components/exercise/RankingExercise'
import { TableExercise } from '@/components/exercise/TableExercise'
import { InfoExercise } from '@/components/exercise/InfoExercise'
import { StructuredTextExercise } from '@/components/exercise/StructuredTextExercise'
import { RatingPickerExercise } from '@/components/exercise/RatingPickerExercise'
import { SectionIntroSlide } from '@/components/section/SectionIntroSlide'
import { SectionClosingSlide } from '@/components/section/SectionClosingSlide'
import { SectionGroupContext } from '@/components/section/SectionGroupContext'
import { SlideNav } from '@/components/section/SlideNav'
import { SECTION_SLUGS, GROUP_SLUGS, ROUTES, type GroupSlug } from '@/lib/constants'
import { groupExercisesBySlide } from '@/lib/exerciseCompletion'
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
  const [resumeExerciseId, setResumeExerciseId] = useState<string | null>(null)
  // Group-context affordance state (US5, 004-content-restructure): the current
  // section's position within its group (1-of-5 etc.). Derived from a one-time
  // fetch of all sections that share the current group_slug.
  const [groupPosition, setGroupPosition] = useState<{ position: number; total: number } | null>(null)

  const sessionId = null // session context wires in a later iteration

  useEffect(() => {
    if (!sectionSlug || !profile?.id) return

    async function load() {
      setLoading(true)

      const { data: sec } = await supabase
        .from('sections')
        .select('*')
        .eq('slug', sectionSlug!)
        .single()

      if (!sec) {
        navigate('/course')
        return
      }

      const { data: exs } = await supabase
        .from('exercises')
        .select('*')
        .eq('section_id', sec.id)
        .order('order_index')

      setSection(sec)
      setExercises(exs ?? [])

      // Derive position-in-group for the section-page affordance.
      if (sec.group_slug && (GROUP_SLUGS as readonly string[]).includes(sec.group_slug)) {
        const { data: peers } = await supabase
          .from('sections')
          .select('slug, order_index')
          .eq('group_slug', sec.group_slug)
          .order('order_index')
        const peerList = peers ?? []
        const idx = peerList.findIndex((p) => p.slug === sec.slug)
        if (idx >= 0) {
          setGroupPosition({ position: idx + 1, total: peerList.length })
        }
      } else {
        setGroupPosition(null)
      }

      if (exs && exs.length > 0) {
        const { data: resps } = await supabase
          .from('responses')
          .select('*')
          .eq('participant_id', profile!.id)
          .in(
            'exercise_id',
            exs.map((e) => e.id)
          )
          .is('session_id', null)

        const respMap: Record<string, Response> = {}
        for (const r of resps ?? []) {
          respMap[r.exercise_id] = r
        }
        setResponses(respMap)
      }

      // Resume position: read progress.last_exercise_id for this section.
      const { data: prog } = await supabase
        .from('progress')
        .select('last_exercise_id')
        .eq('participant_id', profile!.id)
        .eq('section_id', sec.id)
        .is('session_id', null)
        .maybeSingle()
      setResumeExerciseId(prog?.last_exercise_id ?? null)

      setLoading(false)
    }

    load()
  }, [sectionSlug, profile?.id, navigate])

  // Synchronously mirror exercise saves into the local responses map so the
  // slide gate (which reads from `responses`) flips to is_complete=true
  // immediately when the participant clicks an option, without waiting for
  // the Supabase round-trip.
  const localUpdate = useCallback<LocalResponseUpdater>(
    (exerciseId, responseJson, isComplete) => {
      setResponses((prev) => {
        const existing = prev[exerciseId]
        const now = new Date().toISOString()
        const next: Response = existing
          ? { ...existing, response_json: responseJson as Response['response_json'], is_complete: isComplete, updated_at: now }
          : {
              id: `optimistic-${exerciseId}`,
              participant_id: profile!.id,
              exercise_id: exerciseId,
              session_id: null,
              response_json: responseJson as Response['response_json'],
              is_complete: isComplete,
              created_at: now,
              updated_at: now,
            }
        return { ...prev, [exerciseId]: next }
      })
    },
    [profile?.id]
  )

  const slideGroups = useMemo(() => groupExercisesBySlide(exercises), [exercises])

  const introEnabled = !!section?.framing
  const {
    currentSlide,
    canGoNext,
    canGoPrev,
    goNext,
    goPrev,
    isAtIntro,
    isAtClosing,
  } = useSlideState({
    intro: introEnabled,
    slideGroups,
    responses,
    resumeExerciseId,
  })

  const completed = exercises.filter((e) => responses[e.id]?.is_complete).length
  const total = exercises.filter((e) => e.type !== 'info').length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const nextSlug = nextSectionSlug(sectionSlug)
  const prevSlug = prevSectionSlug(sectionSlug)
  const isLastSection = nextSlug === null

  // Boundary-aware nav: at the intro slide, Previous crosses back to the prior
  // section. At the closing slide, Next advances to the next section (or to
  // the course-complete page on the final section).
  const handlePrev = useCallback(() => {
    if (isAtIntro) {
      if (prevSlug) navigate(`/course/${prevSlug}`)
      return
    }
    goPrev()
  }, [isAtIntro, prevSlug, navigate, goPrev])

  const handleNext = useCallback(() => {
    if (isAtClosing) {
      if (isLastSection) navigate(ROUTES.COURSE_COMPLETE)
      else if (nextSlug) navigate(`/course/${nextSlug}`)
      return
    }
    goNext()
  }, [isAtClosing, isLastSection, nextSlug, navigate, goNext])

  const effectiveCanGoPrev = canGoPrev || (isAtIntro && !!prevSlug)
  const effectiveCanGoNext = canGoNext

  // Arrow-key navigation. Skip when focus is in a text field so typing isn't
  // hijacked.
  useEffect(() => {
    function isTypingTarget(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (el.isContentEditable) return true
      return false
    }
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return
      if (e.key === 'ArrowRight') {
        if (effectiveCanGoNext) {
          e.preventDefault()
          handleNext()
        }
      } else if (e.key === 'ArrowLeft') {
        if (effectiveCanGoPrev) {
          e.preventDefault()
          handlePrev()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [effectiveCanGoNext, effectiveCanGoPrev, handleNext, handlePrev])

  if (loading) {
    return (
      <PageShell>
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
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
      case 'ranking': {
        const rankingContent = content as Parameters<typeof RankingExercise>[0]['content']
        let derivesFromResponse: Response | null = null
        if (rankingContent.derives_from?.source_exercise_slug) {
          const sourceSlug = rankingContent.derives_from.source_exercise_slug
          const sourceEx = exercises.find((e) => e.slug === sourceSlug)
          if (sourceEx) derivesFromResponse = responses[sourceEx.id] ?? null
        }
        return (
          <RankingExercise
            {...commonProps}
            content={rankingContent}
            initialResponse={resp?.response_json as Parameters<typeof RankingExercise>[0]['initialResponse']}
            derivesFromResponse={derivesFromResponse}
          />
        )
      }
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
      case 'structured-text':
        return (
          <StructuredTextExercise
            {...commonProps}
            content={content as Parameters<typeof StructuredTextExercise>[0]['content']}
            initialResponse={resp?.response_json as Parameters<typeof StructuredTextExercise>[0]['initialResponse']}
          />
        )
      case 'rating-picker':
        return (
          <RatingPickerExercise
            {...commonProps}
            content={content as Parameters<typeof RatingPickerExercise>[0]['content']}
            initialResponse={resp?.response_json as Parameters<typeof RatingPickerExercise>[0]['initialResponse']}
          />
        )
      default:
        return null
    }
  }

  const slideHint =
    !canGoNext && !isAtIntro && !isAtClosing
      ? 'Complete the exercise to continue'
      : null

  let nextLabel: string | undefined
  if (isAtIntro) nextLabel = 'Begin →'
  else if (isAtClosing) nextLabel = isLastSection ? 'Finish course →' : 'Continue to next section →'

  return (
    <PageShell title={section?.title}>
      <LocalResponseUpdateContext.Provider value={localUpdate}>
      {groupPosition && section?.group_slug && (
        <SectionGroupContext
          groupSlug={section.group_slug as GroupSlug}
          positionInGroup={groupPosition.position}
          groupSize={groupPosition.total}
        />
      )}
      <div className={styles.progressBar}>
        <ProgressRing pct={pct} size={48} strokeWidth={4} />
        <span className={styles.progressLabel}>
          {completed} of {total} exercises complete
        </span>
      </div>

      {section?.subtitle && <p className={styles.filterLabel}>{section.subtitle}</p>}

      <div className={styles.slideTrack}>
        {/* Intro slide */}
        {introEnabled && (
          <section
            className={styles.slide}
            data-slide-active={isAtIntro}
            aria-hidden={!isAtIntro}
          >
            <SectionIntroSlide framing={section?.framing} onBegin={goNext} />
          </section>
        )}

        {/* Exercise slide groups */}
        {slideGroups.map((group, groupIdx) => {
          const active = currentSlide === groupIdx
          return (
            <section
              key={`group-${groupIdx}`}
              className={styles.slide}
              data-slide-active={active}
              aria-hidden={!active}
            >
              {group.map((exercise) => (
                <article
                  key={exercise.id}
                  className={styles.exerciseCard}
                  id={`exercise-${exercise.slug}`}
                >
                  <header className={styles.exerciseHeader}>
                    <h3 className={styles.exerciseTitle}>{exercise.title}</h3>
                    {responses[exercise.id]?.is_complete && exercise.type !== 'info' && (
                      <span className={styles.completedMark} aria-label="Completed">
                        ✓
                      </span>
                    )}
                  </header>
                  <div className={styles.exerciseBody}>{renderExercise(exercise)}</div>
                </article>
              ))}
            </section>
          )
        })}

        {/* Closing slide */}
        <section
          className={styles.slide}
          data-slide-active={isAtClosing}
          aria-hidden={!isAtClosing}
        >
          <SectionClosingSlide
            framing={section?.framing}
            nextSectionSlug={nextSlug}
            isLastSection={isLastSection}
          />
        </section>
      </div>

      <SlideNav
        onPrev={handlePrev}
        onNext={handleNext}
        canGoPrev={effectiveCanGoPrev}
        canGoNext={effectiveCanGoNext}
        nextLabel={nextLabel}
        hint={slideHint}
      />

      <div className={styles.navButtons}>
        <button className={styles.backBtn} onClick={() => navigate('/course')}>
          ← Back to course
        </button>
      </div>
      </LocalResponseUpdateContext.Provider>
    </PageShell>
  )
}

function nextSectionSlug(currentSlug: string | undefined): string | null {
  if (!currentSlug) return null
  const idx = SECTION_SLUGS.indexOf(currentSlug as (typeof SECTION_SLUGS)[number])
  if (idx === -1 || idx === SECTION_SLUGS.length - 1) return null
  return SECTION_SLUGS[idx + 1]
}

function prevSectionSlug(currentSlug: string | undefined): string | null {
  if (!currentSlug) return null
  const idx = SECTION_SLUGS.indexOf(currentSlug as (typeof SECTION_SLUGS)[number])
  if (idx <= 0) return null
  return SECTION_SLUGS[idx - 1]
}
