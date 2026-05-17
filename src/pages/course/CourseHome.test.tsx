import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CourseHome from './CourseHome'

const mockProfile = { id: 'user-1', display_name: 'Jane', role: 'participant' as const }

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: mockProfile, signOut: vi.fn(), loading: false }),
}))

vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({ progress: [], loading: false, error: null, refetch: vi.fn() }),
}))

// Legacy-shape fixture (no group_slug) — preserved so the existing assertions still
// exercise the lock-cascade path against the pre-migration 6-section vocabulary.
// Sections fall into the "Unassigned" fallback band per spec.md Edge Cases until
// migration 014 populates group_slug.
const mockSectionsData = [
  { id: 'sec-1', slug: 'personality', title: 'Personality', subtitle: 'Understanding yourself', order_index: 1, group_slug: null },
  { id: 'sec-2', slug: 'attitudes', title: 'Attitudes', subtitle: null, order_index: 2, group_slug: null },
  { id: 'sec-3', slug: 'values', title: 'Values', subtitle: null, order_index: 3, group_slug: null },
  { id: 'sec-4', slug: 'roles', title: 'Roles & Their Demands', subtitle: null, order_index: 4, group_slug: null },
  { id: 'sec-5', slug: 'skills', title: 'Transferable Skills', subtitle: null, order_index: 5, group_slug: null },
  { id: 'sec-6', slug: 'goals', title: 'Goal Setting', subtitle: null, order_index: 6, group_slug: null },
]

// Post-migration 9-section fixture used by Phase 3 group-band tests.
const mockGroupedSectionsData = [
  { id: 'sec-1', slug: 'personality',                       title: 'Personality',                       subtitle: null, order_index: 1, group_slug: 'self-awareness' },
  { id: 'sec-2', slug: 'attitude',                          title: 'Attitude',                          subtitle: null, order_index: 2, group_slug: 'self-awareness' },
  { id: 'sec-3', slug: 'values',                            title: 'Values',                            subtitle: null, order_index: 3, group_slug: 'self-awareness' },
  { id: 'sec-4', slug: 'roles-and-demands',                 title: 'Roles and Demands',                 subtitle: null, order_index: 4, group_slug: 'self-awareness' },
  { id: 'sec-5', slug: 'transferable-skills',               title: 'Transferable Marketable Skills',    subtitle: null, order_index: 5, group_slug: 'self-awareness' },
  { id: 'sec-6', slug: 'specific-goals',                    title: 'Specific Goals',                    subtitle: null, order_index: 6, group_slug: 'goal-setting' },
  { id: 'sec-7', slug: 'goal-impact-matrix',                title: 'Goal Impact Matrix',                subtitle: null, order_index: 7, group_slug: 'goal-setting' },
  { id: 'sec-8', slug: 'visualization',                     title: 'Visualization',                     subtitle: null, order_index: 8, group_slug: 'goal-setting' },
  { id: 'sec-9', slug: 'removing-obstacles-achieving-goals', title: 'Removing Obstacles, Achieving Goals', subtitle: null, order_index: 9, group_slug: 'strategic-planning' },
]

const makeChain = (data: unknown) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockImplementation(() => Promise.resolve({ data, error: null })),
  then: (cb: (v: { data: unknown; error: null }) => void) =>
    Promise.resolve({ data, error: null }).then(cb),
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'sections') return makeChain(mockSectionsData)
      return makeChain([])
    }),
    rpc: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: [], error: null })
    ),
  },
}))

describe('CourseHome', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders 6 section cards after loading', async () => {
    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Personality')).toBeInTheDocument()
    })

    expect(screen.getByText('Attitudes')).toBeInTheDocument()
    expect(screen.getByText('Values')).toBeInTheDocument()
    expect(screen.getByText('Roles & Their Demands')).toBeInTheDocument()
    expect(screen.getByText('Transferable Skills')).toBeInTheDocument()
    expect(screen.getByText('Goal Setting')).toBeInTheDocument()
  })

  it('renders a ProgressRing for each section card', async () => {
    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Personality')).toBeInTheDocument()
    })

    const rings = document.querySelectorAll('svg')
    // One ring per section card + overall ring
    expect(rings.length).toBeGreaterThanOrEqual(6)
  })

  it('shows the participant greeting with display name', async () => {
    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Jane/i)).toBeInTheDocument()
    })
  })

  it('shows attribution text', async () => {
    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Sam Koshy/i)).toBeInTheDocument()
    })
  })

  it('locks sections beyond Personality when no progress exists', async () => {
    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Attitudes')).toBeInTheDocument()
    })

    // Each locked section card has data-locked="true" and is not a button.
    const attitudesCard = screen.getByText('Attitudes').closest('[data-locked]')
    expect(attitudesCard).not.toBeNull()
    expect(attitudesCard).toHaveAttribute('data-locked', 'true')

    const personalityCard = screen.getByText('Personality').closest('[data-locked]')
    expect(personalityCard).toHaveAttribute('data-locked', 'false')
  })

  it('describes locked sections with an accessible hint naming the prereq', async () => {
    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Attitudes')).toBeInTheDocument()
    })

    const attitudesCard = screen.getByText('Attitudes').closest('[data-locked="true"]')
    expect(attitudesCard).not.toBeNull()
    expect(attitudesCard!.getAttribute('aria-label') ?? '').toMatch(/locked.*personality/i)
  })
})

// 004-content-restructure US1 — group bands on /course
describe('CourseHome — group bands (US1, 004-content-restructure)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders three group headers in workbook order with 5/3/1 section counts', async () => {
    // Re-mock supabase for this describe block via vi.doMock would re-import; instead
    // rely on the same makeChain but pass the grouped fixture. Re-mock at module level
    // via vi.mocked() is awkward — easiest is to swap the underlying data table.
    // For this test, mutate the existing mock implementation's `from` to return grouped.
    const supabaseMod = await import('@/lib/supabase')
    vi.mocked(supabaseMod.supabase.from).mockImplementation((table: string) => {
      if (table === 'sections') return makeChain(mockGroupedSectionsData) as never
      return makeChain([]) as never
    })

    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    // Wait for the first group title to render.
    await waitFor(() => {
      expect(screen.getByText('Self Awareness')).toBeInTheDocument()
    })

    // Three group headers appear, in workbook order.
    const headings = screen.getAllByRole('heading', { level: 2 })
    const titles = headings.map((h) => h.textContent)
    const sa = titles.indexOf('Self Awareness')
    const gs = titles.indexOf('Goal Setting')
    const sp = titles.indexOf('Strategic Planning')
    expect(sa).toBeGreaterThanOrEqual(0)
    expect(gs).toBeGreaterThan(sa)
    expect(sp).toBeGreaterThan(gs)

    // Section card counts per group, located by their group <section data-group="...">.
    const saBand = document.querySelector('[data-group="self-awareness"]')
    const gsBand = document.querySelector('[data-group="goal-setting"]')
    const spBand = document.querySelector('[data-group="strategic-planning"]')
    expect(saBand).not.toBeNull()
    expect(gsBand).not.toBeNull()
    expect(spBand).not.toBeNull()
    expect(saBand!.querySelectorAll('[data-locked]').length).toBe(5)
    expect(gsBand!.querySelectorAll('[data-locked]').length).toBe(3)
    expect(spBand!.querySelectorAll('[data-locked]').length).toBe(1)
  })

  it('marks only the first section unlocked when no progress exists', async () => {
    const supabaseMod = await import('@/lib/supabase')
    vi.mocked(supabaseMod.supabase.from).mockImplementation((table: string) => {
      if (table === 'sections') return makeChain(mockGroupedSectionsData) as never
      return makeChain([]) as never
    })

    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Personality')).toBeInTheDocument()
    })

    const cards = document.querySelectorAll('[data-locked]')
    const unlocked = Array.from(cards).filter((c) => c.getAttribute('data-locked') === 'false')
    expect(unlocked).toHaveLength(1)
    expect(unlocked[0].textContent).toMatch(/Personality/)
  })

  it('renders an empty group band as nothing (does not show an empty header)', async () => {
    const incompleteData = mockGroupedSectionsData.filter((s) => s.group_slug !== 'strategic-planning')
    const supabaseMod = await import('@/lib/supabase')
    vi.mocked(supabaseMod.supabase.from).mockImplementation((table: string) => {
      if (table === 'sections') return makeChain(incompleteData) as never
      return makeChain([]) as never
    })

    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Self Awareness')).toBeInTheDocument()
    })

    expect(screen.queryByText('Strategic Planning')).not.toBeInTheDocument()
  })

  it('routes sections without a recognised group_slug into the Unassigned fallback band', async () => {
    const data = [
      { id: 'orphan-1', slug: 'mystery', title: 'Mystery', subtitle: null, order_index: 1, group_slug: null },
      { id: 'orphan-2', slug: 'mystery-two', title: 'Mystery Two', subtitle: null, order_index: 2, group_slug: 'not-a-real-group' },
    ]
    const supabaseMod = await import('@/lib/supabase')
    vi.mocked(supabaseMod.supabase.from).mockImplementation((table: string) => {
      if (table === 'sections') return makeChain(data) as never
      return makeChain([]) as never
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <CourseHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Unassigned')).toBeInTheDocument()
    })

    const unassignedBand = document.querySelector('[data-group="unassigned"]')
    expect(unassignedBand).not.toBeNull()
    expect(unassignedBand!.querySelectorAll('[data-locked]').length).toBe(2)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
