import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import UsersPage from './UsersPage'

const mockProfiles = [
  {
    id: 'u1',
    display_name: 'Alice Admin',
    email: 'alice@example.com',
    role: 'admin',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'u2',
    display_name: 'Bob Facilitator',
    email: 'bob@example.com',
    role: 'facilitator',
    is_active: true,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'u3',
    display_name: 'Carol Participant',
    email: 'carol@example.com',
    role: 'participant',
    is_active: false,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
]

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { id: 'admin-1', display_name: 'Admin', role: 'admin' },
    signOut: vi.fn(),
    loading: false,
  }),
}))

const makeChain = (data: unknown) => ({
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data, error: null }),
  eq: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => makeChain(mockProfiles)),
  },
}))

describe('UsersPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders a row for each user', async () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument()
    })

    expect(screen.getByText('Bob Facilitator')).toBeInTheDocument()
    expect(screen.getByText('Carol Participant')).toBeInTheDocument()
  })

  it('displays role badge for each user', async () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    expect(screen.getByText('facilitator')).toBeInTheDocument()
    expect(screen.getByText('participant')).toBeInTheDocument()
  })

  it('shows Deactivate button for active users', async () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i })
      expect(deactivateButtons.length).toBeGreaterThan(0)
    })
  })

  it('shows Activate button for inactive users', async () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^reactivate$/i })).toBeInTheDocument()
    })
  })

  it('shows user count in toolbar', async () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/3 users/i)).toBeInTheDocument()
    })
  })
})
