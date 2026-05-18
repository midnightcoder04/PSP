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
import { CoreStyleInfo } from '@/components/exercise/CoreStyleInfo'
import { CoreStyleChecklist } from '@/components/exercise/CoreStyleChecklist'
import { TextExercise } from '@/components/exercise/TextExercise'
import { RankingExercise } from '@/components/exercise/RankingExercise'
import { TableExercise } from '@/components/exercise/TableExercise'
import { LifeGoalInventoryTable } from '@/components/exercise/LifeGoalInventoryTable'
import { CrossImpactMatrix } from '@/components/exercise/CrossImpactMatrix'
import { WhoAmINowExercise } from '@/components/exercise/WhoAmINowExercise'
import { InfoExercise } from '@/components/exercise/InfoExercise'
import { StructuredTextExercise } from '@/components/exercise/StructuredTextExercise'
import { RatingPickerExercise } from '@/components/exercise/RatingPickerExercise'
import { SectionIntroSlide } from '@/components/section/SectionIntroSlide'
import { SectionClosingSlide } from '@/components/section/SectionClosingSlide'
import { SectionGroupContext } from '@/components/section/SectionGroupContext'
import { SlideNav } from '@/components/section/SlideNav'
import { SECTION_SLUGS, GROUP_SLUGS, ROUTES, type GroupSlug } from '@/lib/constants'
import { groupExercisesBySlide } from '@/lib/exerciseCompletion'
import { resolveCoreStyleFromResponses } from '@/lib/coreStyle'
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

      // Round 2: exercises, peer-sections (group position), and progress all
      // only need sec.id / sec.group_slug — fire them in parallel.
      const [exsResult, peersResult, progResult] = await Promise.all([
        supabase
          .from('exercises')
          .select('*')
          .eq('section_id', sec.id)
          .order('order_index'),
        sec.group_slug && (GROUP_SLUGS as readonly string[]).includes(sec.group_slug)
          ? supabase
              .from('sections')
              .select('slug, order_index')
              .eq('group_slug', sec.group_slug)
              .order('order_index')
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('progress')
          .select('last_exercise_id')
          .eq('participant_id', profile!.id)
          .eq('section_id', sec.id)
          .is('session_id', null)
          .maybeSingle(),
      ])

      const exs = exsResult.data ?? []
      setSection(sec)
      setExercises(exs)

      // Derive position-in-group from parallel peers result.
      const peerList = peersResult.data ?? []
      if (peerList.length > 0) {
        const idx = peerList.findIndex((p) => p.slug === sec.slug)
        if (idx >= 0) {
          setGroupPosition({ position: idx + 1, total: peerList.length })
        }
      } else {
        setGroupPosition(null)
      }

      setResumeExerciseId(progResult.data?.last_exercise_id ?? null)

      // Round 3: responses need exercise IDs from round 2.
      if (exs.length > 0) {
        const { data: resps } = await supabase
          .from('responses')
          .select('id, exercise_id, response_json, is_complete, session_id, participant_id, created_at, updated_at')
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
    // 005-iter5-ux-fixes / US3 + FR-020: reset slide state when the
    // participant navigates between sections (e.g. Personality → Attitudes).
    // Without this, currentSlide carries over from the previously-viewed
    // section because the SectionPage component instance is reused across
    // /course/:sectionSlug param changes.
    resetKey: sectionSlug,
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
      case 'checkbox': {
        // 006-iter6 / US3 (T041): per-style traits checklist dispatcher.
        const cbContent = content as { computed?: string; computed_inputs?: string[] } &
          Parameters<typeof CheckboxExercise>[0]['content']
        if (
          cbContent.computed === 'core_style_options' &&
          Array.isArray(cbContent.computed_inputs) &&
          cbContent.computed_inputs.length === 2
        ) {
          const [q1Slug, q2Slug] = cbContent.computed_inputs
          const q1Ex = exercises.find((e) => e.slug === q1Slug)
          const q2Ex = exercises.find((e) => e.slug === q2Slug)
          const q1Response = q1Ex ? responses[q1Ex.id] ?? null : null
          const q2Response = q2Ex ? responses[q2Ex.id] ?? null : null
          return (
            <CoreStyleChecklist
              {...commonProps}
              content={cbContent as unknown as Parameters<typeof CoreStyleChecklist>[0]['content']}
              initialResponse={resp?.response_json as { selected_ids: string[] } | undefined}
              q1Response={q1Response}
              q2Response={q2Response}
            />
          )
        }
        return (
          <CheckboxExercise
            {...commonProps}
            content={content as Parameters<typeof CheckboxExercise>[0]['content']}
            initialResponse={resp?.response_json as Parameters<typeof CheckboxExercise>[0]['initialResponse']}
          />
        )
      }
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
        const derivedConfig =
          exercise.slug === 'what-do-i-value' && !rankingContent.derives_from
            ? {
                source_exercise_slug: 'values-shopping-spree',
                group_by: 'values_pair_sum' as const,
              }
            : rankingContent.derives_from
        if (derivedConfig?.source_exercise_slug) {
          const sourceSlug = derivedConfig.source_exercise_slug
          const sourceEx = exercises.find((e) => e.slug === sourceSlug)
          if (sourceEx) derivesFromResponse = responses[sourceEx.id] ?? null
        }
        return (
          <RankingExercise
            {...commonProps}
            content={{
              ...rankingContent,
              interaction:
                exercise.slug === 'what-do-i-value' && !rankingContent.interaction
                  ? 'sorted'
                  : rankingContent.interaction,
              show_counts:
                exercise.slug === 'what-do-i-value' && rankingContent.show_counts == null
                  ? true
                  : rankingContent.show_counts,
              derives_from: derivedConfig,
            }}
            initialResponse={resp?.response_json as Parameters<typeof RankingExercise>[0]['initialResponse']}
            derivesFromResponse={derivesFromResponse}
          />
        )
      }
      case 'table':
        if (exercise.slug === 'life-goal-inventory') {
          return (
            <LifeGoalInventoryTable
              {...commonProps}
              content={content as Parameters<typeof LifeGoalInventoryTable>[0]['content']}
              initialResponse={resp?.response_json as Parameters<typeof LifeGoalInventoryTable>[0]['initialResponse']}
            />
          )
        }
        if (exercise.slug === 'cross-impact-matrix') {
          return (
            <CrossImpactMatrix
              {...commonProps}
              content={content as Parameters<typeof CrossImpactMatrix>[0]['content']}
              initialResponse={resp?.response_json as Parameters<typeof CrossImpactMatrix>[0]['initialResponse']}
            />
          )
        }
        if (exercise.slug === 'who-am-i-now') {
          return (
            <WhoAmINowExercise
              {...commonProps}
              initialResponse={resp?.response_json as Parameters<typeof TableExercise>[0]['initialResponse']}
            />
          )
        }
        return (
          <TableExercise
            {...commonProps}
            content={content as Parameters<typeof TableExercise>[0]['content']}
            initialResponse={resp?.response_json as Parameters<typeof TableExercise>[0]['initialResponse']}
          />
        )
      case 'info': {
        // 006-iter6 / US3 (T040): per-style deep-dive dispatcher.
        const csSection = content as {
          content: string
          attribution?: string | null
          computed?: string
          computed_inputs?: string[]
          sections_by_style?: Record<'D' | 'I' | 'S' | 'C', string>
        }
        if (
          csSection.computed === 'core_style_section' &&
          Array.isArray(csSection.computed_inputs) &&
          csSection.computed_inputs.length === 2 &&
          csSection.sections_by_style
        ) {
          const [q1Slug, q2Slug] = csSection.computed_inputs
          const q1Ex = exercises.find((e) => e.slug === q1Slug)
          const q2Ex = exercises.find((e) => e.slug === q2Slug)
          const q1Response = q1Ex ? responses[q1Ex.id] ?? null : null
          const q2Response = q2Ex ? responses[q2Ex.id] ?? null : null
          return (
            <CoreStyleInfo
              content={csSection as unknown as Parameters<typeof CoreStyleInfo>[0]['content']}
              q1Response={q1Response}
              q2Response={q2Response}
              attribution={exercise.attribution}
            />
          )
        }
        // 005-iter5-ux-fixes / US5 (FR-051): Personality's `core-style-result`
        // row carries `content.computed === 'core_style'` and a pair of
        // `content.computed_inputs` referencing the two upstream quiz slugs.
        // Read those responses live and substitute `{result}` in the content
        // string with the resolved Core Style sentence.
        const infoContent = content as { content: string; attribution?: string | null; computed?: string; computed_inputs?: string[] }
        let renderedContent = infoContent.content
        if (infoContent.computed === 'core_style' && Array.isArray(infoContent.computed_inputs) && infoContent.computed_inputs.length === 2) {
          const [q1Slug, q2Slug] = infoContent.computed_inputs
          const q1Ex = exercises.find((e) => e.slug === q1Slug)
          const q2Ex = exercises.find((e) => e.slug === q2Slug)
          const q1Resp = q1Ex ? (responses[q1Ex.id]?.response_json as { selected_ids?: string[] } | undefined) : undefined
          const q2Resp = q2Ex ? (responses[q2Ex.id]?.response_json as { selected_ids?: string[] } | undefined) : undefined
          const result = resolveCoreStyleFromResponses(q1Resp, q2Resp)
          const sentence = result
            ? `Your Core Style is **${result.letter} — ${result.name}**.`
            : 'Answer both questions above to see your Core Style.'
          renderedContent = infoContent.content.replace('{result}', sentence)
        }
        return (
          <InfoExercise
            content={{ content: renderedContent, attribution: infoContent.attribution }}
            attribution={exercise.attribution}
          />
        )
      }
      case 'structured-text':
        // Auto-fill the blank in the 'My Top Three Values' prompts from the
        // Values Shopping Spree -> What Do I Value derived totals. We look up
        // the upstream exercises and compute the top three labels, then
        // substitute them into the structured prompts (replace the '___').
        if (exercise.slug === 'top-three-values') {
          try {
            const rankingEx = exercises.find((e) => e.slug === 'what-do-i-value')
            const sourceEx = exercises.find((e) => e.slug === 'values-shopping-spree')
            const contentCopy = JSON.parse(JSON.stringify(content)) as any
            if (rankingEx && sourceEx) {
              const rankingItems = (rankingEx.content_json as any).items ?? []
              const rows = (responses[sourceEx.id]?.response_json as any)?.rows ?? []
              const pairCount = rankingItems.length || 0
              const sums: Array<{ id: string; label: string; total: number }> = rankingItems.map((item: any, idx: number) => {
                const firstRow = rows[idx] ?? []
                const secondRow = rows[idx + pairCount] ?? []
                const parse = (v: string | undefined) => {
                  const cleaned = String(v ?? '').replace(/[^0-9.-]/g, '')
                  const n = parseFloat(cleaned)
                  return Number.isFinite(n) ? n : 0
                }
                const total = parse(firstRow[firstRow.length - 1]) + parse(secondRow[secondRow.length - 1])
                return { id: item.id, label: item.label, total }
              })
              sums.sort((a, b) => b.total - a.total)
              const top3 = sums.slice(0, 3)
              // Replace '___' in the prompt with the short label (before ' —')
              const short = (label: string) => (typeof label === 'string' ? String(label).split(' —')[0] : String(label))
              contentCopy.questions = (contentCopy.questions ?? []).map((q: any, i: number) => {
                const top = top3[i]
                if (top) {
                  // Allow short answers for the value-name field (participant may
                  // only want to type the name). Set min_length to 1 so the
                  // slide gate doesn't block on the 30-char default.
                  const replaced = (q.prompt ?? q.label ?? '').replace('___', short(top.label))
                  return { ...(q as any), prompt: replaced, min_length: 1 }
                }
                return q
              })
            }
            return (
              <StructuredTextExercise
                {...commonProps}
                content={contentCopy as Parameters<typeof StructuredTextExercise>[0]['content']}
                initialResponse={resp?.response_json as Parameters<typeof StructuredTextExercise>[0]['initialResponse']}
              />
            )
          } catch (err) {
            // Fall back to normal rendering on error
            return (
              <StructuredTextExercise
                {...commonProps}
                content={content as Parameters<typeof StructuredTextExercise>[0]['content']}
                initialResponse={resp?.response_json as Parameters<typeof StructuredTextExercise>[0]['initialResponse']}
              />
            )
          }
        }
        // If a structured-text exercise contains many separate questions (4+),
        // participants commonly fill short statements into each. Relax the
        // per-question min_length to 1 at render time so the slide gate does
        // not block when users enter short answers for each prompt. This is a
        // non-destructive render-time change (seed content unchanged) and
        // covers Past Experience Inventory, Contract With Myself, Mission
        // Statement, Favorite Skills, and similar multi-question exercises.
        try {
          const maybeQuestions = (content as any)?.questions
          if (Array.isArray(maybeQuestions) && maybeQuestions.length >= 2) {
            const contentCopy = JSON.parse(JSON.stringify(content)) as any
            contentCopy.questions = (contentCopy.questions ?? []).map((q: any) => ({ ...(q as any), min_length: 1 }))
            return (
              <StructuredTextExercise
                {...commonProps}
                content={contentCopy as Parameters<typeof StructuredTextExercise>[0]['content']}
                initialResponse={resp?.response_json as Parameters<typeof StructuredTextExercise>[0]['initialResponse']}
              />
            )
          }
        } catch (err) {
          // Fall through to default rendering on error
        }
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
        onBackToCourse={() => navigate('/course')}
      />
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
