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

vi.mock('@/hooks/useRealtimeSession', () => ({
  useRealtimeSession: vi.fn(),
}))

const mockSessionInfo = {
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
  single: vi.fn().mockResolvedValue({ data: mockSessionInfo, error: null }),
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
  beforeEach(() => vi.clearAllMocks())

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
})
