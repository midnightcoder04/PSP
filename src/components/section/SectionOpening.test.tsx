import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionOpening } from './SectionOpening'
import type { SectionFraming } from '@/types/database'

const sample: SectionFraming = {
  opening_quote: {
    text: 'Until you make the unconscious conscious, it will direct your life and you will call it fate.',
    attribution: '— Carl Jung',
  },
  opening_question:
    'If we asked the five people closest to you to describe how you make decisions, would they all give the same answer?',
  facilitator_says:
    "D.I.S.C. isn't a label — it's a mirror. Today we're going to look at how you naturally show up.",
  why_it_matters:
    "Strategy starts with self-knowledge. You can't plan a life you don't understand.",
  closing_reflection: 'unused-by-opening',
  bridge_to_next: 'unused-by-opening',
}

describe('SectionOpening', () => {
  it('renders the opening quote text inside a blockquote', () => {
    const { container } = render(<SectionOpening framing={sample} />)
    const block = container.querySelector('blockquote')
    expect(block).not.toBeNull()
    expect(block!.textContent).toContain(sample.opening_quote.text)
  })

  it('renders the attribution inside a <cite> element', () => {
    const { container } = render(<SectionOpening framing={sample} />)
    const cite = container.querySelector('cite')
    expect(cite).not.toBeNull()
    expect(cite!.textContent).toBe(sample.opening_quote.attribution)
  })

  it('renders the opening question', () => {
    render(<SectionOpening framing={sample} />)
    expect(screen.getByText(sample.opening_question)).toBeInTheDocument()
  })

  it('renders the facilitator_says cue', () => {
    render(<SectionOpening framing={sample} />)
    expect(screen.getByText(sample.facilitator_says)).toBeInTheDocument()
  })

  it('renders the why_it_matters paragraph', () => {
    render(<SectionOpening framing={sample} />)
    expect(screen.getByText(sample.why_it_matters)).toBeInTheDocument()
  })

  it('returns null when framing is null', () => {
    const { container } = render(<SectionOpening framing={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
