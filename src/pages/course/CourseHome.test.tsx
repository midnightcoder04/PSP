import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CourseHome from './CourseHome'

const mockProfile = { id: 'user-1', display_name: 'Jane', role: 'participant' as const }

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: mockProfile, signOut: vi.fn(), loading: false }),
}))

vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({ progress: [], loading: false, error: null, refetch: vi.fn() }),
}))

const mockSectionsData = [
  { id: 'sec-1', slug: 'personality', title: 'Personality', subtitle: 'Understanding yourself', order_index: 1 },
  { id: 'sec-2', slug: 'attitudes', title: 'Attitudes', subtitle: null, order_index: 2 },
  { id: 'sec-3', slug: 'values', title: 'Values', subtitle: null, order_index: 3 },
  { id: 'sec-4', slug: 'roles', title: 'Roles & Their Demands', subtitle: null, order_index: 4 },
  { id: 'sec-5', slug: 'skills', title: 'Transferable Skills', subtitle: null, order_index: 5 },
  { id: 'sec-6', slug: 'goals', title: 'Goal Setting', subtitle: null, order_index: 6 },
]

const makeChain = (data: unknown) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockImplementation(() => Promise.resolve({ data, error: null })),
  then: (cb: (v: { data: unknown; error: null }) => void) =>
    Promise.resolve({ data, error: null }).then(cb),
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'sections') return makeChain(mockSectionsData)
      return makeChain([])
    }),
    rpc: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: [], error: null })
    ),
  },
}))

describe('CourseHome', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders 6 section cards after loading', async () => {
    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Personality')).toBeInTheDocument()
    })

    expect(screen.getByText('Attitudes')).toBeInTheDocument()
    expect(screen.getByText('Values')).toBeInTheDocument()
    expect(screen.getByText('Roles & Their Demands')).toBeInTheDocument()
    expect(screen.getByText('Transferable Skills')).toBeInTheDocument()
    expect(screen.getByText('Goal Setting')).toBeInTheDocument()
  })

  it('renders a ProgressRing for each section card', async () => {
    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Personality')).toBeInTheDocument()
    })

    const rings = document.querySelectorAll('svg')
    // One ring per section card + overall ring
    expect(rings.length).toBeGreaterThanOrEqual(6)
  })

  it('shows the participant greeting with display name', async () => {
    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Jane/i)).toBeInTheDocument()
    })
  })

  it('shows attribution text', async () => {
    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Sam Koshy/i)).toBeInTheDocument()
    })
  })
})
