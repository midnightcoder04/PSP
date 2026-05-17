import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SectionClosing } from './SectionClosing'
import type { SectionFraming } from '@/types/database'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const sample: SectionFraming = {
  opening_quote: { text: 'unused', attribution: 'unused' },
  opening_question: 'unused',
  facilitator_says: 'unused',
  why_it_matters: 'unused',
  closing_reflection: 'Which one attitude — if you changed it tomorrow — would change the most about your life?',
  bridge_to_next: 'Attitudes are HOW you see. Values are WHAT you protect.',
}

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('SectionClosing', () => {
  beforeEach(() => mockNavigate.mockReset())

  it('renders the closing reflection question', () => {
    renderWithRouter(<SectionClosing framing={sample} nextSectionSlug="values" />)
    expect(screen.getByText(sample.closing_reflection)).toBeInTheDocument()
  })

  it('renders the bridge_to_next paragraph when present', () => {
    renderWithRouter(<SectionClosing framing={sample} nextSectionSlug="values" />)
    expect(screen.getByText(sample.bridge_to_next!)).toBeInTheDocument()
  })

  it('renders Continue button labelled with the next-section affordance', () => {
    renderWithRouter(<SectionClosing framing={sample} nextSectionSlug="values" />)
    expect(
      screen.getByRole('button', { name: /continue to next section/i })
    ).toBeInTheDocument()
  })

  it('navigates to /course/<nextSectionSlug> when Continue is clicked', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SectionClosing framing={sample} nextSectionSlug="values" />)
    await user.click(screen.getByRole('button', { name: /continue to next section/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/course/values')
  })

  it('shows "Return to course home" button when nextSectionSlug is null', async () => {
    const user = userEvent.setup()
    const finalFraming: SectionFraming = { ...sample, bridge_to_next: null }
    renderWithRouter(<SectionClosing framing={finalFraming} nextSectionSlug={null} />)
    const btn = screen.getByRole('button', { name: /return to course home/i })
    expect(btn).toBeInTheDocument()
    await user.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith('/course')
  })

  it('returns null when framing is null', () => {
    const { container } = renderWithRouter(
      <SectionClosing framing={null} nextSectionSlug="values" />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
