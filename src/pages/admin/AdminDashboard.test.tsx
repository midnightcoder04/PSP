import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminDashboard from './AdminDashboard'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { id: 'admin-1', display_name: 'Admin', role: 'admin' },
    signOut: vi.fn(),
    loading: false,
  }),
}))

const mockOverview = {
  total_sessions: 4,
  active_sessions: 2,
  total_participants: 18,
  overall_completion_pct: 62,
  sections: [
    { slug: 'personality', title: 'Personality', avg_completion_pct: 75 },
    { slug: 'attitudes', title: 'Attitudes', avg_completion_pct: 50 },
  ],
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: mockOverview, error: null })
    ),
    from: vi.fn(),
  },
}))

describe('AdminDashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders Total Sessions stat card', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Total Sessions')).toBeInTheDocument()
    })
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('renders Total Participants stat card', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Total Participants')).toBeInTheDocument()
    })
    expect(screen.getByText('18')).toBeInTheDocument()
  })

  it('renders Overall Completion stat card with percent', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Overall Completion')).toBeInTheDocument()
    })
    expect(screen.getByText('62%')).toBeInTheDocument()
  })

  it('renders Active Sessions stat card', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Active Sessions')).toBeInTheDocument()
    })
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
