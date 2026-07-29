import { describe, it, expect } from 'vitest'
import { buildPresentedSlides, TEAM_COLLAB_CHAPTER } from './presentDeck'
import type { DeckSlide, TopicSegment, TrainingTopic, Json } from '@/types/database'

function deck(slug: string, chapter: string, order: number): DeckSlide {
  return {
    id: `deck-${slug}`,
    slug,
    kind: 'statement',
    chapter,
    order_index: order,
    content_json: { title: slug, body: '' } as Json,
    linked_exercise_slugs: [],
    notes: null,
    updated_at: '2026-07-15T00:00:00Z',
  }
}

function seg(
  id: string,
  topic_id: string,
  chapter: string,
  order = 0,
  is_active = true
): TopicSegment {
  return {
    id,
    topic_id,
    chapter,
    kind: 'discussion',
    content_json: { title: id, questions: ['q?'] } as Json,
    order_index: order,
    is_active,
    updated_at: '2026-07-15T00:00:00Z',
  }
}

function topic(id: string, order: number): TrainingTopic {
  return {
    id,
    slug: id,
    name: id,
    description: null,
    is_active: true,
    order_index: order,
    updated_at: '2026-07-15T00:00:00Z',
  }
}

// A deck spanning the chapters used by the tests.
const DECK: DeckSlide[] = [
  deck('open', 'opening', 1),
  deck('pers-a', 'personality', 2),
  deck('pers-b', 'personality', 3),
  deck('att', 'attitudes', 4),
  deck('val', 'values', 5),
  deck('close', 'closing', 6),
]

describe('buildPresentedSlides', () => {
  it('returns the deck unchanged when there are no segments and type is individual', () => {
    const out = buildPresentedSlides(DECK, [], [], 'individual')
    expect(out.map((s) => s.slug)).toEqual(DECK.map((s) => s.slug))
  })

  it('inserts a segment after the last slide of its chapter', () => {
    const t = topic('t1', 10)
    const out = buildPresentedSlides(DECK, [seg('s1', 't1', 'personality')], [t], 'individual')
    const slugs = out.map((s) => s.slug)
    // lands after pers-b (the last personality slide), before the attitudes slide
    expect(slugs).toEqual([
      'open',
      'pers-a',
      'pers-b',
      'topic-segment:s1',
      'att',
      'val',
      'close',
    ])
    const inserted = out.find((s) => s.id === 's1')!
    expect(inserted.kind).toBe('discussion')
    expect(inserted.chapter).toBe('personality')
  })

  it('orders inserts by topic order then segment order', () => {
    const topics = [topic('tB', 20), topic('tA', 10)]
    const segments = [
      seg('b1', 'tB', 'attitudes', 0),
      seg('a2', 'tA', 'attitudes', 5),
      seg('a1', 'tA', 'attitudes', 1),
    ]
    const out = buildPresentedSlides(DECK, segments, topics, 'individual')
    const ids = out.filter((s) => s.chapter === 'attitudes' && s.id !== 'deck-att').map((s) => s.id)
    // topic tA (order 10) before tB (order 20); within tA, order 1 before 5
    expect(ids).toEqual(['a1', 'a2', 'b1'])
  })

  it('injects the team-collaboration slide after the values chapter for team-based sessions', () => {
    const out = buildPresentedSlides(DECK, [], [], 'team-based')
    const slugs = out.map((s) => s.slug)
    const valIdx = slugs.indexOf('val')
    expect(slugs[valIdx + 1]).toBe('team-collaboration')
    expect(out.find((s) => s.kind === 'team-collaboration')?.chapter).toBe(TEAM_COLLAB_CHAPTER)
  })

  it('does not inject the team-collaboration slide for individual/private-group', () => {
    for (const t of ['individual', 'private-group'] as const) {
      const out = buildPresentedSlides(DECK, [], [], t)
      expect(out.some((s) => s.kind === 'team-collaboration')).toBe(false)
    }
  })

  it('places the team-collab slide after that chapter’s segments', () => {
    const t = topic('t1', 10)
    const out = buildPresentedSlides(DECK, [seg('s1', 't1', 'values')], [t], 'team-based')
    const slugs = out.map((s) => s.slug)
    expect(slugs.slice(slugs.indexOf('val'))).toEqual([
      'val',
      'topic-segment:s1',
      'team-collaboration',
      'close',
    ])
  })

  it('appends the team-collab slide at the end when the deck has no values chapter', () => {
    const noValues = DECK.filter((s) => s.chapter !== 'values')
    const out = buildPresentedSlides(noValues, [], [], 'team-based')
    expect(out[out.length - 1].kind).toBe('team-collaboration')
  })

  it('skips inactive segments', () => {
    const t = topic('t1', 10)
    const out = buildPresentedSlides(DECK, [seg('s1', 't1', 'personality', 0, false)], [t], 'individual')
    expect(out.some((s) => s.id === 's1')).toBe(false)
  })

  it('appends orphan-chapter segments (no deck slides for that chapter) at the end', () => {
    const t = topic('t1', 10)
    const out = buildPresentedSlides(DECK, [seg('s1', 't1', 'goals')], [t], 'individual')
    expect(out[out.length - 1].id).toBe('s1')
  })
})
