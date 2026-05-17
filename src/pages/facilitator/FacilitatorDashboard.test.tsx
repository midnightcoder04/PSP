import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FacilitatorDashboard from './FacilitatorDashboard'

const mockProfile = { id: 'fac-1', display_name: 'Facilitator Bob', role: 'facilitator' as const }

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: mockProfile, signOut: vi.fn(), loading: false }),
}))

const mockSessions = [
  {
    id: 'ses-1',
    title: 'PSP Batch 7',
    scheduled_start: '2026-05-01T09:00:00Z',
    scheduled_end: '2026-05-10T17:00:00Z',
    is_active: true,
    enrollments: [{ count: 8 }],
  },
  {
    id: 'ses-2',
    title: 'Leadership Cohort',
    scheduled_start: null,
    scheduled_end: null,
    is_active: false,
    enrollments: [{ count: 3 }],
  },
]

const mockStats = [
  { participant_id: 'p1', overall_pct: 80 },
  { participant_id: 'p2', overall_pct: 60 },
]

const makeChain = (data: unknown) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data, error: null }),
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => makeChain(mockSessions)),
    rpc: vi.fn().mockImplementation(() => Promise.resolve({ data: mockStats, error: null })),
  },
}))

describe('FacilitatorDashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders session cards for assigned sessions', async () => {
    render(
      <MemoryRouter>
        <FacilitatorDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('PSP Batch 7')).toBeInTheDocument()
    })

    expect(screen.getByText('Leadership Cohort')).toBeInTheDocument()
  })

  it('shows participant count on each session card', async () => {
    render(
      <MemoryRouter>
        <FacilitatorDashboard />
      </MemoryRouter>
    )

    // enrollment_count is derived from get_session_stats length (mockStats has 2 entries)
    await waitFor(() => {
      expect(screen.getAllByText(/2 participant/i).length).toBeGreaterThan(0)
    })
  })

  it('shows Active badge for active sessions', async () => {
    render(
      <MemoryRouter>
        <FacilitatorDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  it('shows Archived badge for inactive sessions', async () => {
    render(
      <MemoryRouter>
        <FacilitatorDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Archived')).toBeInTheDocument()
    })
  })

  it('renders a View Progress button for each session', async () => {
    render(
      <MemoryRouter>
        <FacilitatorDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      const viewBtns = screen.getAllByRole('button', { name: /view progress/i })
      expect(viewBtns).toHaveLength(2)
    })
  })
})
