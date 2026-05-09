import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import FacilitatorSessionDetailPage from './FacilitatorSessionDetailPage'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { id: 'fac-1', display_name: 'Facilitator Bob', role: 'facilitator' },
    signOut: vi.fn(),
    loading: false,
  }),
}))

const mockUseRealtimeSession = vi.fn()
vi.mock('@/hooks/useRealtimeSession', () => ({
  useRealtimeSession: (args: unknown) => mockUseRealtimeSession(args),
}))

let mockSessionInfo = {
  title: 'PSP Batch 7',
  scheduled_end: '2026-06-01T00:00:00Z',
  is_active: true,
}

const mockStats = [
  {
    participant_id: 'p1',
    display_name: 'Alice Smith',
    overall_pct: 75,
    sections: [
      { slug: 'personality', completed: 3, total: 4, completed_at: null },
      { slug: 'attitudes', completed: 2, total: 3, completed_at: null },
    ],
  },
  {
    participant_id: 'p2',
    display_name: 'Bob Jones',
    overall_pct: 40,
    sections: [
      { slug: 'personality', completed: 1, total: 4, completed_at: null },
      { slug: 'attitudes', completed: 0, total: 3, completed_at: null },
    ],
  },
]

const makeSessionChain = () => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockImplementation(() =>
    Promise.resolve({ data: mockSessionInfo, error: null })
  ),
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => makeSessionChain()),
    rpc: vi.fn().mockImplementation(() => Promise.resolve({ data: mockStats, error: null })),
  },
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/facilitator/sessions/ses-1']}>
      <Routes>
        <Route path="/facilitator/sessions/:id" element={<FacilitatorSessionDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('FacilitatorSessionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionInfo = {
      title: 'PSP Batch 7',
      scheduled_end: '2026-06-01T00:00:00Z',
      is_active: true,
    }
  })

  it('renders one row per enrolled participant', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })

    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
  })

  it('renders section progress columns for each participant', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })

    expect(screen.getAllByText(/personality/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/attitudes/i).length).toBeGreaterThan(0)
  })

  it('shows overall completion percentage column', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })

    expect(screen.getByText('Overall')).toBeInTheDocument()
  })

  it('shows participant count', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/2 participants/i)).toBeInTheDocument()
    })
  })

  it('shows Live badge for an active session', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument()
    })
  })

  it('shows Session Archived badge and disables Realtime when scheduled_end is past', async () => {
    mockSessionInfo = {
      title: 'PSP Batch 1 (archived)',
      scheduled_end: '2024-01-01T00:00:00Z',
      is_active: true,
    }

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Session Archived')).toBeInTheDocument()
    })

    expect(screen.queryByText('Live')).not.toBeInTheDocument()

    // Realtime hook is invoked but with enabled: false so no subscription is created.
    const calls = mockUseRealtimeSession.mock.calls
    expect(calls.length).toBeGreaterThan(0)
    const lastCall = calls[calls.length - 1][0] as { enabled: boolean }
    expect(lastCall.enabled).toBe(false)
  })

  it('shows Session Archived when is_active is false even with future end date', async () => {
    mockSessionInfo = {
      title: 'PSP Batch 4 (manually archived)',
      scheduled_end: '2099-01-01T00:00:00Z',
      is_active: false,
    }

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Session Archived')).toBeInTheDocument()
    })
  })
})
