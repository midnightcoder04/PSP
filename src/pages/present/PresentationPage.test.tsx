import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PresentationPage from './PresentationPage'

const mockSlides = [
  {
    id: 's1',
    slug: 'opening-cover',
    kind: 'cover',
    chapter: 'opening',
    order_index: 10,
    content_json: { title: 'Personal Strategic Planning™' },
    linked_exercise_slugs: [],
    notes: null,
    updated_at: '2026-07-10T00:00:00Z',
  },
  {
    id: 's2',
    slug: 'personality-quiz',
    kind: 'section-title',
    chapter: 'personality',
    order_index: 20,
    content_json: { title: 'What are you predominantly?' },
    linked_exercise_slugs: ['core-style-q1-extroversion'],
    notes: null,
    updated_at: '2026-07-10T00:00:00Z',
  },
  {
    id: 's3',
    slug: 'values-title',
    kind: 'section-title',
    chapter: 'values',
    order_index: 30,
    content_json: { title: 'MY VALUES' },
    linked_exercise_slugs: [],
    notes: null,
    updated_at: '2026-07-10T00:00:00Z',
  },
]

const mockProfile = {
  id: 'f1',
  role: 'facilitator',
  display_name: 'Fran',
  is_active: true,
  can_present: true,
}

let mockSessionType = 'individual'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: mockProfile, signOut: vi.fn(), loading: false }),
}))

// The responses panel's live data is exercised in ResponsesPanel.test.tsx; here
// it only needs to render so the hide-names default can be asserted.
vi.mock('@/hooks/usePresentationResponses', () => ({
  usePresentationResponses: () => ({ rows: [], loading: false, refresh: vi.fn() }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'deck_slides') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockSlides, error: null }),
        }
      }
      if (table === 'sessions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { title: 'Spring Cohort', session_type: mockSessionType }, error: null }),
        }
      }
      if (table === 'session_topics') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === 'exercises') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              {
                slug: 'core-style-q1-extroversion',
                title: 'Core Style Q1',
                type: 'checkbox',
                content_json: { options: [] },
              },
            ],
            error: null,
          }),
        }
      }
      // session_deck_overrides
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
  },
}))

async function renderPage(initialEntry = '/facilitator/sessions/sess-1/present') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/facilitator/sessions/:id/present" element={<PresentationPage />} />
        <Route path="/facilitator/sessions/:id" element={<p>session detail page</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PresentationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfile.can_present = true
    mockSessionType = 'individual'
  })

  it('renders the first slide with a slide counter', async () => {
    await renderPage()
    expect(await screen.findByText('Personal Strategic Planning™')).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getByText('Spring Cohort')).toBeInTheDocument()
  })

  it('navigates with arrow keys', async () => {
    await renderPage()
    await screen.findByText('Personal Strategic Planning™')

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(await screen.findByText('What are you predominantly?')).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(await screen.findByText('Personal Strategic Planning™')).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('deep-links to a slide via ?slide=n', async () => {
    await renderPage('/facilitator/sessions/sess-1/present?slide=3')
    expect(await screen.findByText('MY VALUES')).toBeInTheDocument()
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })

  it('does not advance past the last slide', async () => {
    await renderPage('/facilitator/sessions/sess-1/present?slide=3')
    await screen.findByText('MY VALUES')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })

  it('opens the slide menu with M and jumps to a slide', async () => {
    const user = userEvent.setup()
    await renderPage()
    await screen.findByText('Personal Strategic Planning™')

    fireEvent.keyDown(window, { key: 'm' })
    const menu = await screen.findByRole('dialog', { name: /slide menu/i })
    expect(menu).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /go to slide 3/i }))
    expect(screen.queryByRole('dialog', { name: /slide menu/i })).not.toBeInTheDocument()
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })

  it('shows the Responses control only on slides linked to exercises', async () => {
    await renderPage()
    await screen.findByText('Personal Strategic Planning™')
    expect(screen.queryByRole('button', { name: /responses/i })).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(await screen.findByRole('button', { name: /responses/i })).toBeInTheDocument()
  })

  it('hides participant names by default and lets the presenter reveal them', async () => {
    const user = userEvent.setup()
    await renderPage()
    await screen.findByText('Personal Strategic Planning™')

    // Slide 2 is the only one linked to an exercise, so it can open the panel.
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await screen.findByRole('button', { name: /responses/i })
    fireEvent.keyDown(window, { key: 'r' })

    const toggle = await screen.findByRole('checkbox', { name: /hide names/i })
    expect(toggle).toBeChecked()

    await user.click(toggle)
    expect(toggle).not.toBeChecked()
  })

  it('injects the team-collaboration slide for team-based sessions', async () => {
    mockSessionType = 'team-based'
    await renderPage()
    await screen.findByText('Personal Strategic Planning™')
    // deck (3) + one synthesized team-collaboration slide
    expect(screen.getByText('1 / 4')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'm' })
    await screen.findByRole('dialog', { name: /slide menu/i })
    expect(screen.getByRole('button', { name: /go to slide 4/i })).toBeInTheDocument()
    // the placeholder renders in the menu thumbnail (no live data fetch)
    expect(screen.getAllByText(/team collaboration/i).length).toBeGreaterThan(0)
  })

  it('keeps the deck unchanged for individual sessions', async () => {
    await renderPage()
    await screen.findByText('Personal Strategic Planning™')
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  // PDF export lives on the session page now, not in the presenter HUD; it is
  // covered by DeckPdfButton.test.tsx.
  it('offers no PDF download inside the presentation view', async () => {
    await renderPage()
    await screen.findByText('Personal Strategic Planning™')
    expect(screen.queryByRole('button', { name: /pdf/i })).not.toBeInTheDocument()
  })

  it('shows an authorization notice to unflagged facilitators', async () => {
    mockProfile.can_present = false
    await renderPage()
    expect(await screen.findByText('Authorization required')).toBeInTheDocument()
    expect(screen.queryByText('Personal Strategic Planning™')).not.toBeInTheDocument()
  })
})
