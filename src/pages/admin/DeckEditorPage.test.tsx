import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DeckEditorPage from './DeckEditorPage'

const mockSlides = [
  {
    id: 's1',
    slug: 'opening-franklin-quote',
    kind: 'quote',
    chapter: 'opening',
    order_index: 10,
    content_json: {
      quote: 'If you fail to plan, you are planning to fail.',
      attribution: 'Benjamin Franklin',
    },
    linked_exercise_slugs: [],
    notes: null,
    updated_at: '2026-07-10T00:00:00Z',
  },
  {
    id: 's2',
    slug: 'opening-expectation-setting',
    kind: 'bullets',
    chapter: 'opening',
    order_index: 60,
    content_json: {
      title: 'Expectation Setting',
      bullets: ['Trust your instincts', 'Think holistically'],
    },
    linked_exercise_slugs: [],
    notes: 'Warm the room up first.',
    updated_at: '2026-07-10T00:00:00Z',
  },
  {
    id: 's3',
    slug: 'values-my-values-1',
    kind: 'section-title',
    chapter: 'values',
    order_index: 340,
    content_json: { title: 'MY VALUES' },
    linked_exercise_slugs: ['what-do-i-value'],
    notes: null,
    updated_at: '2026-07-10T00:00:00Z',
  },
]

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { id: 'admin-1', display_name: 'Admin', role: 'admin' },
    signOut: vi.fn(),
    loading: false,
  }),
}))

const updateEq = vi.fn().mockResolvedValue({ error: null })
const update = vi.fn(() => ({ eq: updateEq }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockSlides, error: null }),
      update,
    })),
  },
}))

async function renderPage() {
  render(
    <MemoryRouter>
      <DeckEditorPage />
    </MemoryRouter>
  )
  await waitFor(() => {
    expect(screen.getByText('Expectation Setting')).toBeInTheDocument()
  })
}

describe('DeckEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateEq.mockResolvedValue({ error: null })
  })

  it('lists slides grouped by chapter', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: 'Opening' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Values' })).toBeInTheDocument()
    // appears in both the slide list and the live preview
    expect(screen.getAllByText(/if you fail to plan/i).length).toBeGreaterThan(0)
  })

  it('marks slides linked to exercises with a linked badge', async () => {
    await renderPage()
    expect(screen.getByText('linked')).toBeInTheDocument()
  })

  it('auto-selects the first slide and shows its editable fields', async () => {
    await renderPage()
    expect(screen.getByLabelText('Quote')).toHaveValue(
      'If you fail to plan, you are planning to fail.'
    )
    expect(screen.getByLabelText('Attribution')).toHaveValue('Benjamin Franklin')
  })

  it('does not offer inputs for structural fields', async () => {
    await renderPage()
    // slug is displayed read-only, never as a form control
    expect(screen.queryByDisplayValue('opening-franklin-quote')).not.toBeInTheDocument()
    expect(screen.getAllByText('opening-franklin-quote').length).toBeGreaterThan(0)
  })

  it('saves edited content via update({ content_json, notes })', async () => {
    const user = userEvent.setup()
    await renderPage()

    const attribution = screen.getByLabelText('Attribution')
    await user.clear(attribution)
    await user.type(attribution, 'B. Franklin')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          content_json: expect.objectContaining({ attribution: 'B. Franklin' }),
          notes: null,
        })
      )
    })
    expect(updateEq).toHaveBeenCalledWith('id', 's1')
    expect(await screen.findByText('Slide saved')).toBeInTheDocument()
  })

  it('switches slides and loads the per-kind form', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /expectation setting/i }))
    expect(screen.getByLabelText(/bullets/i)).toHaveValue(
      'Trust your instincts\nThink holistically'
    )
    expect(screen.getByLabelText('Speaker notes')).toHaveValue('Warm the room up first.')
  })

  it('asks for confirmation before discarding unsaved changes', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await renderPage()

    await user.type(screen.getByLabelText('Attribution'), ' Sr.')
    await user.click(screen.getByRole('button', { name: /expectation setting/i }))

    expect(confirmSpy).toHaveBeenCalled()
    // stayed on the quote slide because confirm returned false
    expect(screen.getByLabelText('Attribution')).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('surfaces a save error as a toast', async () => {
    const user = userEvent.setup()
    updateEq.mockResolvedValue({ error: { message: 'permission denied' } })
    await renderPage()

    await user.type(screen.getByLabelText('Attribution'), '!')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/save failed: permission denied/i)).toBeInTheDocument()
  })
})
