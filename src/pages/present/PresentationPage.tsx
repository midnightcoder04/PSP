import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/Spinner'
import { DeckSlideView } from '@/components/deck/DeckSlideView'
import { PresenterHud } from '@/components/deck/PresenterHud'
import { ResponsesPanel } from '@/components/deck/ResponsesPanel'
import { SlideMenu } from '@/components/deck/SlideMenu'
import { TeamCollaborationSlide } from '@/components/deck/TeamCollaborationSlide'
import { buildPresentedSlides } from '@/lib/presentDeck'
import type {
  DeckSlide,
  PresentedSlide,
  SessionCoverOverride,
  SessionType,
  TopicSegment,
  TrainingTopic,
} from '@/types/database'
import styles from './PresentationPage.module.css'

export default function PresentationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [slides, setSlides] = useState<PresentedSlide[]>([])
  const [sessionTitle, setSessionTitle] = useState('')
  const [coverOverride, setCoverOverride] = useState<SessionCoverOverride | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [responsesOpen, setResponsesOpen] = useState(false)
  // Per-slide "hide names" preference for the live responses panel
  const [hideNamesBySlide, setHideNamesBySlide] = useState<ReadonlyMap<string, boolean>>(new Map())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const authorized = profile?.can_present === true

  useEffect(() => {
    if (!id || !authorized) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      const [deckRes, sessionRes, overrideRes, topicLinkRes] = await Promise.all([
        supabase.from('deck_slides').select('*').order('order_index', { ascending: true }),
        supabase.from('sessions').select('title, session_type').eq('id', id).single(),
        supabase.from('session_deck_overrides').select('cover_json').eq('session_id', id).maybeSingle(),
        supabase.from('session_topics').select('training_topics(*)').eq('session_id', id),
      ])

      // Embedded to-one select: each link row carries its training_topics row.
      const topics = (topicLinkRes.data ?? [])
        .map((r) => {
          const t = (r as { training_topics: TrainingTopic | TrainingTopic[] | null }).training_topics
          return Array.isArray(t) ? t[0] : t
        })
        .filter((t): t is TrainingTopic => t != null)

      let segments: TopicSegment[] = []
      if (topics.length > 0) {
        const segRes = await supabase
          .from('topic_segments')
          .select('*')
          .in('topic_id', topics.map((t) => t.id))
          .eq('is_active', true)
        segments = (segRes.data ?? []) as TopicSegment[]
      }

      if (cancelled) return
      const deckSlides = (deckRes.data ?? []) as DeckSlide[]
      const sessionType = (sessionRes.data?.session_type ?? 'individual') as SessionType
      setSlides(buildPresentedSlides(deckSlides, segments, topics, sessionType))
      setSessionTitle(sessionRes.data?.title ?? '')
      setCoverOverride((overrideRes.data?.cover_json as SessionCoverOverride) ?? null)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id, authorized])

  // ── Slide index lives in ?slide=n so refresh/deep-link lands on the same slide ──
  const total = slides.length
  const rawIndex = parseInt(searchParams.get('slide') ?? '1', 10)
  const index = Math.min(Math.max(Number.isNaN(rawIndex) ? 1 : rawIndex, 1), Math.max(total, 1)) - 1
  const current: DeckSlide | undefined = slides[index]
  const hasLinkedExercises = (current?.linked_exercise_slugs.length ?? 0) > 0

  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.min(Math.max(i, 0), total - 1)
      setSearchParams({ slide: String(clamped + 1) }, { replace: true })
      setMenuOpen(false)
    },
    [total, setSearchParams]
  )
  const goNext = useCallback(() => goTo(index + 1), [goTo, index])
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen?.()
    } else {
      el.requestFullscreen?.()
    }
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleHideNames = useCallback(() => {
    if (!current) return
    setHideNamesBySlide((prev) => {
      const next = new Map(prev)
      next.set(current.id, !(prev.get(current.id) ?? false))
      return next
    })
  }, [current])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault()
          goNext()
          break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          goPrev()
          break
        case 'm':
        case 'M':
          setMenuOpen((v) => !v)
          break
        case 'r':
        case 'R':
          if (hasLinkedExercises) setResponsesOpen((v) => !v)
          break
        case 'n':
        case 'N':
          toggleHideNames()
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'Escape':
          setMenuOpen(false)
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goNext, goPrev, hasLinkedExercises, toggleHideNames, toggleFullscreen])

  const exitTo = `/facilitator/sessions/${id}`

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.centerBox}><Spinner size="lg" /></div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className={styles.container}>
        <div className={styles.centerBox}>
          <div className={styles.notice}>
            <h1>Authorization required</h1>
            <p>
              Presentation mode is available to authorized presenters only.
              Ask an administrator to grant you presenter access.
            </p>
            <Link className={styles.backLink} to={exitTo}>← Back to session</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!current) {
    return (
      <div className={styles.container}>
        <div className={styles.centerBox}>
          <div className={styles.notice}>
            <h1>Deck not available</h1>
            <p>No presentation slides are loaded. Ask an administrator to seed the deck.</p>
            <Link className={styles.backLink} to={exitTo}>← Back to session</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.stageArea}>
        <div className={styles.stage}>
          {current.kind === 'team-collaboration' && id ? (
            <TeamCollaborationSlide
              sessionId={id}
              hideNames={hideNamesBySlide.get(current.id) ?? false}
            />
          ) : (
            <DeckSlideView slide={current} coverOverride={coverOverride} />
          )}
        </div>
      </div>

      {responsesOpen && hasLinkedExercises && id ? (
        <ResponsesPanel
          key={current.id}
          sessionId={id}
          slide={current}
          hideNames={hideNamesBySlide.get(current.id) ?? false}
          onToggleHideNames={toggleHideNames}
          onClose={() => setResponsesOpen(false)}
        />
      ) : null}

      <PresenterHud
        index={index}
        total={total}
        sessionTitle={sessionTitle}
        hasLinkedExercises={hasLinkedExercises}
        responsesOpen={responsesOpen && hasLinkedExercises}
        isFullscreen={isFullscreen}
        onPrev={goPrev}
        onNext={goNext}
        onToggleMenu={() => setMenuOpen((v) => !v)}
        onToggleResponses={() => setResponsesOpen((v) => !v)}
        onToggleFullscreen={toggleFullscreen}
        onExit={() => navigate(exitTo)}
      />

      {menuOpen ? (
        <SlideMenu
          slides={slides}
          coverOverride={coverOverride}
          currentIndex={index}
          onSelect={goTo}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}
    </div>
  )
}
