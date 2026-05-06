import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
}

const mockExercises = [
  {
    id: 'ex-1',
    section_id: 'sec-1',
    slug: 'disc-overview',
    title: 'D.I.S.C. Overview',
    type: 'info',
    order_index: 1,
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

describe('SectionPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders exercises after loading', async () => {
    renderSectionPage()

    await waitFor(() => {
      expect(screen.getByText('D.I.S.C. Overview')).toBeInTheDocument()
    })

    expect(screen.getByText('My D.I.S.C. Style')).toBeInTheDocument()
  })

  it('renders exercises in order_index order', async () => {
    renderSectionPage()

    await waitFor(() => {
      expect(screen.getByText('D.I.S.C. Overview')).toBeInTheDocument()
    })

    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings[0]).toHaveTextContent('D.I.S.C. Overview')
    expect(headings[1]).toHaveTextContent('My D.I.S.C. Style')
  })

  it('shows the section title', async () => {
    renderSectionPage()

    await waitFor(() => {
      expect(screen.getByText('Personality')).toBeInTheDocument()
    })
  })

  it('renders a back button', async () => {
    renderSectionPage()

    await waitFor(() => {
      expect(screen.getByText(/back to course/i)).toBeInTheDocument()
    })
  })
})
