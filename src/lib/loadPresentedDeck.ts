import { supabase } from '@/lib/supabase'
import { buildPresentedSlides } from '@/lib/presentDeck'
import type {
  DeckSlide,
  PresentedSlide,
  SessionCoverOverride,
  SessionType,
  TopicSegment,
  TrainingTopic,
} from '@/types/database'

export interface PresentedDeck {
  slides: PresentedSlide[]
  sessionTitle: string
  coverOverride: SessionCoverOverride | null
}

/**
 * Loads everything needed to render a session's deck: the base slides, the
 * session's cover customization, and the topic segments that get woven in as
 * topic-aware inserts. Shared by the presentation view and the PDF export so
 * both produce the exact same deck.
 */
export async function loadPresentedDeck(sessionId: string): Promise<PresentedDeck> {
  const [deckRes, sessionRes, overrideRes, topicLinkRes] = await Promise.all([
    supabase.from('deck_slides').select('*').order('order_index', { ascending: true }),
    supabase.from('sessions').select('title, session_type, restrict_to_values').eq('id', sessionId).single(),
    supabase.from('session_deck_overrides').select('cover_json').eq('session_id', sessionId).maybeSingle(),
    supabase.from('session_topics').select('training_topics(*)').eq('session_id', sessionId),
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

  const deckSlides = (deckRes.data ?? []) as DeckSlide[]
  const sessionType = (sessionRes.data?.session_type ?? 'individual') as SessionType
  const restrictToValues = sessionRes.data?.restrict_to_values ?? false

  return {
    slides: buildPresentedSlides(deckSlides, segments, topics, sessionType, restrictToValues),
    sessionTitle: sessionRes.data?.title ?? '',
    coverOverride: (overrideRes.data?.cover_json as SessionCoverOverride) ?? null,
  }
}
