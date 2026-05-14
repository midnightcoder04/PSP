import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SectionIntroSlide } from './SectionIntroSlide'
import type { SectionFraming } from '@/types/database'

const baseFraming: SectionFraming = {
  opening_quote: { text: 'Know thyself.', attribution: '— Inscription, Temple of Apollo' },
  opening_question: 'What part of yourself are you avoiding?',
  facilitator_says: 'Take five deep breaths.',
  why_it_matters: 'Strategy starts with self-knowledge.',
  closing_reflection: 'unused-here',
  bridge_to_next: 'unused-here',
}

describe('SectionIntroSlide', () => {
  it('renders the opening quote, opening question, and why-it-matters', () => {
    render(<SectionIntroSlide framing={baseFraming} onBegin={() => {}} />)
    expect(screen.getByText(/know thyself/i)).toBeInTheDocument()
    expect(screen.getByText(/what part of yourself are you avoiding/i)).toBeInTheDocument()
    expect(screen.getByText(/strategy starts with self-knowledge/i)).toBeInTheDocument()
  })

  it('hides the reading_material block when absent', () => {
    render(<SectionIntroSlide framing={baseFraming} onBegin={() => {}} />)
    expect(screen.queryByText(/anything to read/i)).not.toBeInTheDocument()
  })

  it('renders the reading_material block when present', () => {
    const framing: SectionFraming = {
      ...baseFraming,
      reading_material: {
        title: 'Understanding D.I.S.C.',
        content: 'A short primer on the DISC behavioural model.',
        url: 'https://example.test/disc',
      },
    }
    render(<SectionIntroSlide framing={framing} onBegin={() => {}} />)
    expect(screen.getByText(/anything to read/i)).toBeInTheDocument()
    expect(screen.getByText(/understanding d\.i\.s\.c\./i)).toBeInTheDocument()
    expect(screen.getByText(/a short primer/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /understanding d\.i\.s\.c\./i })).toHaveAttribute(
      'href',
      'https://example.test/disc'
    )
  })

  it('renders nothing when framing is null', () => {
    const { container } = render(<SectionIntroSlide framing={null} onBegin={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('fires onBegin when Begin button is clicked', async () => {
    const user = userEvent.setup()
    const onBegin = vi.fn()
    render(<SectionIntroSlide framing={baseFraming} onBegin={onBegin} />)
    await user.click(screen.getByRole('button', { name: /begin/i }))
    expect(onBegin).toHaveBeenCalledTimes(1)
  })
})
