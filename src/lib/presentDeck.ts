/**
 * 007 — topic-aware presentation.
 *
 * Merges the fixed presenter deck (deck_slides) with per-session topic inserts
 * (topic_segments) and, for team-based sessions, a team-collaboration slide —
 * producing the ordered slide list the presenter actually steps through.
 *
 * Inserts are synthesized as PresentedSlide objects (a DeckSlide widened to
 * allow the extra kinds) so the rest of the presenter pipeline — index math in
 * PresentationPage, chapter grouping in SlideMenu, the HUD counter — works
 * unchanged. Nothing here is persisted.
 */
import type {
  DeckSlide,
  PresentedSlide,
  SessionType,
  TopicSegment,
  TrainingTopic,
  Json,
} from '@/types/database'

/** Canonical chapter order, matching the deck seed + migration 036 CHECK. */
export const CHAPTER_ORDER = [
  'opening',
  'personality',
  'attitudes',
  'values',
  'roles',
  'skills',
  'goals',
  'closing',
] as const

/**
 * The team-collaboration slide lands after this chapter's last deck slide —
 * by the end of Values the participants have answered the DISC quiz, the values
 * spree, and the attitudes exercise, so all three limited-profile facets exist.
 */
export const TEAM_COLLAB_CHAPTER = 'values'

function segmentToSlide(seg: TopicSegment): PresentedSlide {
  return {
    id: seg.id,
    slug: `topic-segment:${seg.id}`,
    kind: seg.kind,
    chapter: seg.chapter,
    order_index: -1,
    content_json: seg.content_json,
    linked_exercise_slugs: [],
    notes: null,
    updated_at: seg.updated_at,
  }
}

function teamCollabSlide(): PresentedSlide {
  return {
    id: 'team-collaboration',
    slug: 'team-collaboration',
    kind: 'team-collaboration',
    chapter: TEAM_COLLAB_CHAPTER,
    order_index: -1,
    content_json: {} as Json,
    linked_exercise_slugs: [],
    notes: null,
    updated_at: '',
  }
}

export function buildPresentedSlides(
  deckSlides: DeckSlide[],
  segments: TopicSegment[],
  topics: TrainingTopic[],
  sessionType: SessionType
): PresentedSlide[] {
  const topicOrder = new Map(topics.map((t) => [t.id, t.order_index]))

  // Active segments grouped by chapter, ordered by (topic order, segment order).
  const byChapter = new Map<string, TopicSegment[]>()
  for (const seg of segments) {
    if (!seg.is_active) continue
    const list = byChapter.get(seg.chapter) ?? []
    list.push(seg)
    byChapter.set(seg.chapter, list)
  }
  for (const list of byChapter.values()) {
    list.sort((a, b) => {
      const ta = topicOrder.get(a.topic_id) ?? Number.MAX_SAFE_INTEGER
      const tb = topicOrder.get(b.topic_id) ?? Number.MAX_SAFE_INTEGER
      if (ta !== tb) return ta - tb
      if (a.order_index !== b.order_index) return a.order_index - b.order_index
      return a.id.localeCompare(b.id)
    })
  }

  // The final array index at which each chapter appears (inserts flush here,
  // so interleaved chapters still get their block after their last slide).
  const lastIndexOfChapter = new Map<string, number>()
  deckSlides.forEach((s, i) => lastIndexOfChapter.set(s.chapter, i))

  const wantTeamCollab = sessionType === 'team-based'
  let teamCollabPlaced = false

  const out: PresentedSlide[] = []
  deckSlides.forEach((slide, i) => {
    out.push(slide)
    if (lastIndexOfChapter.get(slide.chapter) !== i) return

    for (const seg of byChapter.get(slide.chapter) ?? []) out.push(segmentToSlide(seg))
    if (wantTeamCollab && !teamCollabPlaced && slide.chapter === TEAM_COLLAB_CHAPTER) {
      out.push(teamCollabSlide())
      teamCollabPlaced = true
    }
  })

  // Segments authored for a chapter with no deck slides: append in canonical
  // chapter order so nothing is silently dropped.
  const orphanChapters = [...byChapter.keys()]
    .filter((c) => !lastIndexOfChapter.has(c))
    .sort(
      (a, b) =>
        (CHAPTER_ORDER.indexOf(a as (typeof CHAPTER_ORDER)[number]) + 1 || 99) -
        (CHAPTER_ORDER.indexOf(b as (typeof CHAPTER_ORDER)[number]) + 1 || 99)
    )
  for (const chapter of orphanChapters) {
    for (const seg of byChapter.get(chapter) ?? []) out.push(segmentToSlide(seg))
  }

  // Team-based session whose deck has no Values chapter: still show the slide.
  if (wantTeamCollab && !teamCollabPlaced) out.push(teamCollabSlide())

  return out
}
