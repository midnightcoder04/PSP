import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { SidebarCollapseContext, useSidebarCollapse } from '@/hooks/useSidebarCollapse'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { id: 'u1', role: 'participant', display_name: 'Jane' },
    signOut: vi.fn(),
    loading: false,
  }),
}))

function Wrapper({ children }: { children: React.ReactNode }) {
  const state = useSidebarCollapse()
  return (
    <MemoryRouter>
      <SidebarCollapseContext.Provider value={state}>
        {children}
      </SidebarCollapseContext.Provider>
    </MemoryRouter>
  )
}

describe('Sidebar — 005-iter5-ux-fixes / US1 collapse', () => {
  beforeEach(() => window.localStorage.clear())

  it('renders expanded by default with data-collapsed="false" and aria-expanded="true"', () => {
    render(<Sidebar />, { wrapper: Wrapper })
    const aside = screen.getByRole('complementary', { name: /main navigation/i })
    expect(aside.getAttribute('data-collapsed')).toBe('false')
    const toggle = screen.getByRole('button', { name: /collapse sidebar/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.getAttribute('aria-controls')).toBe('primary-sidebar')
    expect(aside.id).toBe('primary-sidebar')
  })

  it('toggling flips data-collapsed and updates aria-expanded + aria-label', async () => {
    const user = userEvent.setup()
    render(<Sidebar />, { wrapper: Wrapper })
    const aside = screen.getByRole('complementary', { name: /main navigation/i })
    const toggle = screen.getByRole('button', { name: /collapse sidebar/i })

    await user.click(toggle)

    expect(aside.getAttribute('data-collapsed')).toBe('true')
    // Re-query because the accessible name changed
    const expandToggle = screen.getByRole('button', { name: /expand sidebar/i })
    expect(expandToggle.getAttribute('aria-expanded')).toBe('false')

    await user.click(expandToggle)
    expect(aside.getAttribute('data-collapsed')).toBe('false')
  })

  it('persists collapsed state to localStorage on toggle', async () => {
    const user = userEvent.setup()
    render(<Sidebar />, { wrapper: Wrapper })
    const toggle = screen.getByRole('button', { name: /collapse sidebar/i })
    await user.click(toggle)
    expect(window.localStorage.getItem('psp:sidebar:collapsed')).toBe('true')
  })

  it('mounts collapsed when localStorage was previously set to true', () => {
    window.localStorage.setItem('psp:sidebar:collapsed', 'true')
    render(<Sidebar />, { wrapper: Wrapper })
    const aside = screen.getByRole('complementary', { name: /main navigation/i })
    expect(aside.getAttribute('data-collapsed')).toBe('true')
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument()
  })
})
