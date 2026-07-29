import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ResponsesPanel } from './ResponsesPanel'
import type { DeckSlide } from '@/types/database'
import type { LiveResponseRow } from '@/hooks/usePresentationResponses'

let mockRows: LiveResponseRow[] = []

vi.mock('@/hooks/usePresentationResponses', () => ({
  usePresentationResponses: () => ({ rows: mockRows, loading: false, refresh: vi.fn() }),
}))

const mockExercises = [
  {
    slug: 'core-style-q1-extroversion',
    title: 'Core Style Q1',
    type: 'checkbox',
    content_json: {
      options: [
        { id: 'q1_extroverted', label: 'Extroverted' },
        { id: 'q1_introverted', label: 'Introverted' },
      ],
    },
  },
  {
    slug: 'core-style-q2-orientation',
    title: 'Core Style Q2',
    type: 'checkbox',
    content_json: {
      options: [
        { id: 'q2_people', label: 'People-oriented' },
        { id: 'q2_task', label: 'Task-oriented' },
      ],
    },
  },
  {
    slug: 'identifying-attitudes',
    title: 'Identifying Attitudes',
    type: 'checkbox',
    content_json: { options: [] },
  },
  {
    slug: 'life-line-exercise',
    title: 'My Life Line',
    type: 'text',
    content_json: { prompt: 'Draw your life line' },
  },
]

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn((_col: string, slugs: string[]) =>
        Promise.resolve({
          data: mockExercises.filter((e) => slugs.includes(e.slug)),
          error: null,
        })
      ),
    })),
  },
}))

function makeSlide(linked: string[]): DeckSlide {
  return {
    id: 'slide-1',
    slug: 'test-slide',
    kind: 'section-title',
    chapter: 'personality',
    order_index: 10,
    content_json: { title: 'Test' },
    linked_exercise_slugs: linked,
    notes: null,
    updated_at: '2026-07-10T00:00:00Z',
  }
}

function row(overrides: Partial<LiveResponseRow>): LiveResponseRow {
  return {
    participant_id: 'p1',
    display_name: 'Alice Smith',
    exercise_slug: 'life-line-exercise',
    exercise_type: 'text',
    response_json: null,
    is_complete: false,
    updated_at: null,
    ...overrides,
  }
}

const noop = () => {}

describe('ResponsesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRows = []
  })

  it('shows answered count for a single linked exercise', async () => {
    mockRows = [
      row({ participant_id: 'p1', display_name: 'Alice Smith', response_json: { value: 'My journey' } }),
      row({ participant_id: 'p2', display_name: 'Bob Jones', response_json: null }),
    ]
    render(
      <ResponsesPanel
        sessionId="s1"
        slide={makeSlide(['life-line-exercise'])}
        hideNames={false}
        onToggleHideNames={noop}
        onClose={noop}
      />
    )
    expect(await screen.findByText('1 of 2 answered')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('My journey')).toBeInTheDocument()
  })

  it('anonymizes text cards when hideNames is on', async () => {
    mockRows = [
      row({ participant_id: 'p1', display_name: 'Alice Smith', response_json: { value: 'My journey' } }),
    ]
    render(
      <ResponsesPanel
        sessionId="s1"
        slide={makeSlide(['life-line-exercise'])}
        hideNames
        onToggleHideNames={noop}
        onClose={noop}
      />
    )
    expect(await screen.findByText('Participant 1')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('aggregates a checkbox exercise into option bars with name chips', async () => {
    const slide = makeSlide(['core-style-q1-extroversion'])
    mockRows = [
      row({
        participant_id: 'p1',
        display_name: 'Alice Smith',
        exercise_slug: 'core-style-q1-extroversion',
        exercise_type: 'checkbox',
        response_json: { selected_ids: ['q1_extroverted'] },
      }),
      row({
        participant_id: 'p2',
        display_name: 'Bob Jones',
        exercise_slug: 'core-style-q1-extroversion',
        exercise_type: 'checkbox',
        response_json: { selected_ids: ['q1_extroverted'] },
      }),
      row({
        participant_id: 'p3',
        display_name: 'Cara Lee',
        exercise_slug: 'core-style-q1-extroversion',
        exercise_type: 'checkbox',
        response_json: { selected_ids: ['q1_introverted'] },
      }),
    ]
    render(
      <ResponsesPanel
        sessionId="s1"
        slide={slide}
        hideNames={false}
        onToggleHideNames={noop}
        onClose={noop}
      />
    )
    expect(await screen.findByText('Extroverted')).toBeInTheDocument()
    expect(screen.getByText('Introverted')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Cara')).toBeInTheDocument()
  })

  it('renders a DISC distribution when both quiz slugs are linked', async () => {
    const slide = makeSlide(['core-style-q1-extroversion', 'core-style-q2-orientation'])
    mockRows = [
      // Alice: Extroverted + Task → D
      row({ participant_id: 'p1', display_name: 'Alice Smith', exercise_slug: 'core-style-q1-extroversion', exercise_type: 'checkbox', response_json: { selected_ids: ['q1_extroverted'] } }),
      row({ participant_id: 'p1', display_name: 'Alice Smith', exercise_slug: 'core-style-q2-orientation', exercise_type: 'checkbox', response_json: { selected_ids: ['q2_task'] } }),
      // Bob: Introverted + People → S
      row({ participant_id: 'p2', display_name: 'Bob Jones', exercise_slug: 'core-style-q1-extroversion', exercise_type: 'checkbox', response_json: { selected_ids: ['q1_introverted'] } }),
      row({ participant_id: 'p2', display_name: 'Bob Jones', exercise_slug: 'core-style-q2-orientation', exercise_type: 'checkbox', response_json: { selected_ids: ['q2_people'] } }),
      // Cara: only q1 answered → unresolved
      row({ participant_id: 'p3', display_name: 'Cara Lee', exercise_slug: 'core-style-q1-extroversion', exercise_type: 'checkbox', response_json: { selected_ids: ['q1_extroverted'] } }),
      row({ participant_id: 'p3', display_name: 'Cara Lee', exercise_slug: 'core-style-q2-orientation', exercise_type: 'checkbox', response_json: null }),
    ]
    render(
      <ResponsesPanel
        sessionId="s1"
        slide={slide}
        hideNames={false}
        onToggleHideNames={noop}
        onClose={noop}
      />
    )
    expect(await screen.findByText('D — Dominance')).toBeInTheDocument()
    expect(screen.getByText('S — Steadiness')).toBeInTheDocument()
    expect(screen.getByText(/resolved for 2 of 3 participants/i)).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders six WATUSI bars for the identifying-attitudes exercise', async () => {
    const slide = makeSlide(['identifying-attitudes'])
    mockRows = [
      row({
        participant_id: 'p1',
        display_name: 'Alice Smith',
        exercise_slug: 'identifying-attitudes',
        exercise_type: 'checkbox',
        response_json: { selected_ids: ['w_1', 'w_2', 'a_1'] },
      }),
      row({
        participant_id: 'p2',
        display_name: 'Bob Jones',
        exercise_slug: 'identifying-attitudes',
        exercise_type: 'checkbox',
        response_json: { selected_ids: ['w_3', 's_1'] },
      }),
    ]
    render(
      <ResponsesPanel
        sessionId="s1"
        slide={slide}
        hideNames={false}
        onToggleHideNames={noop}
        onClose={noop}
      />
    )
    expect(await screen.findByText('W — Theoretical')).toBeInTheDocument()
    expect(screen.getByText('A — Aesthetic')).toBeInTheDocument()
    expect(screen.getByText('U — Utilitarian')).toBeInTheDocument()
    // W bar aggregates 3 selections across the two participants
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders tabs when multiple exercises are linked (non-DISC)', async () => {
    const slide = makeSlide(['identifying-attitudes', 'life-line-exercise'])
    mockRows = []
    render(
      <ResponsesPanel
        sessionId="s1"
        slide={slide}
        hideNames={false}
        onToggleHideNames={noop}
        onClose={noop}
      />
    )
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Identifying Attitudes' })).toBeInTheDocument()
    })
    expect(screen.getByRole('tab', { name: 'My Life Line' })).toBeInTheDocument()
  })
})
