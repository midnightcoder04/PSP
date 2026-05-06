import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'

const mockSignIn = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { signInWithPassword: (...args: unknown[]) => mockSignIn(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: null, signOut: vi.fn(), loading: false }),
}))

function setup() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignIn.mockResolvedValue({ data: { user: null }, error: null })
  })

  it('renders email and password fields', () => {
    setup()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders a sign in button', () => {
    setup()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('calls supabase.auth.signInWithPassword with entered credentials on submit', async () => {
    const user = userEvent.setup()
    setup()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'secret123',
    })
  })

  it('shows an error message when sign-in fails', async () => {
    mockSignIn.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid credentials' } })
    const user = userEvent.setup()
    setup()

    await user.type(screen.getByLabelText(/email/i), 'bad@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
  })

  it('shows the PSP™ branding', () => {
    setup()
    expect(screen.getByText('PSP™')).toBeInTheDocument()
  })
})
