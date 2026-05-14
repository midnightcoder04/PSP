import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SectionPage from './SectionPage'

const mockProfile = { id: 'user-1', display_name: 'Jane', role: 'participant' as const }

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: mockProfile, signOut: vi.fn(), loading: false }),
}))

vi.mock('@/hooks/useExerciseSave', () => ({
  useExerciseSave: () => ({ save: vi.fn(), saveImmediate: vi.fn(), status: 'idle' }),
}))

const mockSection = {
  id: 'sec-1',
  slug: 'personality',
  title: 'Personality',
  subtitle: 'Understand your natural style',
  order_index: 1,
  framing: null,
}

const mockExercises = [
  {
    id: 'ex-1',
    section_id: 'sec-1',
    slug: 'disc-overview',
    title: 'D.I.S.C. Overview',
    type: 'info',
    order_index: 1,
    slide_group: null,
    content_json: { content: 'The D.I.S.C. model describes four primary behavioural styles.' },
    attribution: 'Adapted from Bill Bonnstetter / Target Training International',
  },
  {
    id: 'ex-2',
    section_id: 'sec-1',
    slug: 'disc-self',
    title: 'My D.I.S.C. Style',
    type: 'checkbox',
    order_index: 2,
    slide_group: null,
    content_json: {
      prompt: 'Select your dominant style',
      options: [
        { id: 'D', label: 'Dominance' },
        { id: 'I', label: 'Influence' },
      ],
    },
    attribution: null,
  },
]

function makeChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    then: (cb: (v: { data: unknown; error: null }) => void) =>
      Promise.resolve({ data, error: null }).then(cb),
  }
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'sections') return makeChain(mockSection)
      if (table === 'exercises') return makeChain(mockExercises)
      if (table === 'responses') return makeChain([])
      return makeChain(null)
    }),
  },
}))

function renderSectionPage() {
  return render(
    <MemoryRouter initialEntries={['/course/personality']}>
      <Routes>
        <Route path="/course/:sectionSlug" element={<SectionPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SectionPage (slide-based)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the section title', async () => {
    renderSectionPage()
    await waitFor(() => {
      expect(screen.getByText('Personality')).toBeInTheDocument()
    })
  })

  it('renders only one active slide at a time', async () => {
    renderSectionPage()
    await waitFor(() => {
      expect(screen.getByText('D.I.S.C. Overview')).toBeInTheDocument()
    })
    const activeSlides = document.querySelectorAll('[data-slide-active="true"]')
    expect(activeSlides).toHaveLength(1)
  })

  it('shows the next button which advances slides', async () => {
    const user = userEvent.setup()
    renderSectionPage()
    await waitFor(() => {
      expect(screen.getByText('D.I.S.C. Overview')).toBeInTheDocument()
    })

    // First exercise is info type → next is enabled.
    const next = screen.getByRole('button', { name: /next slide/i })
    expect(next).not.toBeDisabled()
    await user.click(next)

    // After advancing, the checkbox slide is active.
    await waitFor(() => {
      const active = document.querySelectorAll('[data-slide-active="true"]')
      expect(active).toHaveLength(1)
      expect(active[0].textContent).toContain('My D.I.S.C. Style')
    })
  })

  it('disables next on the checkbox slide until the exercise is complete', async () => {
    const user = userEvent.setup()
    renderSectionPage()
    await waitFor(() => {
      expect(screen.getByText('D.I.S.C. Overview')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /next slide/i }))

    await waitFor(() => {
      const next = screen.getByRole('button', { name: /next slide|finish section/i })
      expect(next).toBeDisabled()
    })
  })

  it('renders a back-to-course control', async () => {
    renderSectionPage()
    await waitFor(() => {
      expect(screen.getByText(/back to course/i)).toBeInTheDocument()
    })
  })
})
