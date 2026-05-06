import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SessionsPage from './SessionsPage'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { id: 'admin-1', display_name: 'Admin', role: 'admin' },
    signOut: vi.fn(),
    loading: false,
  }),
}))

const mockSessions = [
  {
    id: 'ses-1',
    title: 'Batch 7 — May 2026',
    scheduled_start: '2026-05-01T09:00:00Z',
    scheduled_end: '2026-05-03T17:00:00Z',
    is_active: true,
    facilitator: { display_name: 'Bob Facilitator' },
    enrollments: [{ count: 12 }],
  },
  {
    id: 'ses-2',
    title: 'Leadership Workshop',
    scheduled_start: null,
    scheduled_end: null,
    is_active: false,
    facilitator: { display_name: 'Carol Facilitator' },
    enrollments: [{ count: 5 }],
  },
]

const makeChain = (data: unknown) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data, error: null }),
  insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  then: (cb: (v: { data: unknown; error: null }) => void) =>
    Promise.resolve({ data, error: null }).then(cb),
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'sessions') return makeChain(mockSessions)
      return makeChain([]) // facilitators for modal
    }),
  },
}))

describe('SessionsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders session rows with titles', async () => {
    render(
      <MemoryRouter>
        <SessionsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Batch 7 — May 2026')).toBeInTheDocument()
    })

    expect(screen.getByText('Leadership Workshop')).toBeInTheDocument()
  })

  it('displays facilitator name for each session', async () => {
    render(
      <MemoryRouter>
        <SessionsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Bob Facilitator')).toBeInTheDocument()
    })

    expect(screen.getByText('Carol Facilitator')).toBeInTheDocument()
  })

  it('displays participant count for each session', async () => {
    render(
      <MemoryRouter>
        <SessionsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument()
    })

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows session count in toolbar', async () => {
    render(
      <MemoryRouter>
        <SessionsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/2 sessions/i)).toBeInTheDocument()
    })
  })

  it('renders New Session button', async () => {
    render(
      <MemoryRouter>
        <SessionsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new session/i })).toBeInTheDocument()
    })
  })
})
