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

const mockSelfPacedProgress = [
  { last_activity_at: '2026-02-01T00:00:00Z', section_completed_at: '2026-02-10T00:00:00Z' },
  { last_activity_at: '2026-02-15T00:00:00Z', section_completed_at: null },
]

// Builds a Supabase-like query chain that resolves with the given data.
function makeChain<T>(data: T) {
  const result = { data, error: null as null }
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    then: (onFulfilled: (v: typeof result) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
  }
  return chain
}

type TableName = 'enrollments' | 'progress'
let enrollmentData: typeof mockEnrollments | [] = mockEnrollments
let progressData: typeof mockSelfPacedProgress | [] = []

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: TableName) => {
      if (table === 'progress') return makeChain(progressData)
      return makeChain(enrollmentData)
    }),
  },
}))

describe('CourseHistoryPage', () => {
  beforeEach(() => {
    enrollmentData = mockEnrollments
    progressData = []
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

  it('shows empty state when there are no enrollments and no self-paced progress', async () => {
    enrollmentData = []
    progressData = []

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

  it('shows a Self-Paced Journey entry when no enrollment but progress exists', async () => {
    enrollmentData = []
    progressData = mockSelfPacedProgress

    render(
      <MemoryRouter>
        <CourseHistoryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Self-Paced Journey')).toBeInTheDocument()
    })

    expect(screen.getByText(/Independent/i)).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('shows Completed badge for self-paced when all sections have completion dates', async () => {
    enrollmentData = []
    progressData = [
      { last_activity_at: '2026-02-01T00:00:00Z', section_completed_at: '2026-02-10T00:00:00Z' },
      { last_activity_at: '2026-02-20T00:00:00Z', section_completed_at: '2026-02-20T00:00:00Z' },
    ]

    render(
      <MemoryRouter>
        <CourseHistoryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Self-Paced Journey')).toBeInTheDocument()
    })

    expect(screen.getByText('Completed')).toBeInTheDocument()
  })
})
