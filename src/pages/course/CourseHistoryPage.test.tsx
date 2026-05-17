import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CourseHistoryPage from './CourseHistoryPage'

const mockProfile = { id: 'user-1', display_name: 'Jane', role: 'participant' as const }

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: mockProfile, signOut: vi.fn(), loading: false }),
}))

const mockEnrollments = [
  {
    id: 'enr-1',
    session_id: 'ses-1',
    enrolled_at: '2026-03-01T00:00:00Z',
    session: {
      title: 'PSP Batch 7',
      facilitator: { display_name: 'Facilitator Bob' },
    },
  },
  {
    id: 'enr-2',
    session_id: 'ses-2',
    enrolled_at: '2026-01-15T00:00:00Z',
    session: {
      title: 'Leadership Cohort',
      facilitator: { display_name: 'Facilitator Carol' },
    },
  },
]

// Builds a Supabase-like query chain that resolves with the given data.
// Every chain method returns the chain itself; the chain is a thenable
// so `.then(cb)` calls cb with { data, error: null }.
function makeChain<T>(data: T) {
  const result = { data, error: null as null }
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    then: (onFulfilled: (v: typeof result) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
  }
  return chain
}

let currentChainData: typeof mockEnrollments | [] = mockEnrollments

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => makeChain(currentChainData)),
  },
}))

describe('CourseHistoryPage', () => {
  beforeEach(() => {
    currentChainData = mockEnrollments
  })

  it('renders a list of past enrollments with session titles', async () => {
    render(
      <MemoryRouter>
        <CourseHistoryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('PSP Batch 7')).toBeInTheDocument()
    })

    expect(screen.getByText('Leadership Cohort')).toBeInTheDocument()
  })

  it('displays facilitator name for each enrollment', async () => {
    render(
      <MemoryRouter>
        <CourseHistoryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Facilitator Bob/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Facilitator Carol/i)).toBeInTheDocument()
  })

  it('shows enrollment date for each entry', async () => {
    render(
      <MemoryRouter>
        <CourseHistoryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText(/enrolled/i).length).toBeGreaterThan(0)
    })
  })

  it('shows In Progress badge for sessions without a completion date', async () => {
    render(
      <MemoryRouter>
        <CourseHistoryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      const badges = screen.getAllByText('In Progress')
      expect(badges.length).toBe(2)
    })
  })

  it('shows empty state when there are no past enrollments', async () => {
    currentChainData = []

    render(
      <MemoryRouter>
        <CourseHistoryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/No past sessions yet/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Go to My Course/i })).toBeInTheDocument()
  })
})
