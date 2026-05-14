import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestimonialList } from './TestimonialList'

const sampleRows = [
  {
    id: 't1',
    content: 'Loved every minute of the workshop. Bijo was incredible.',
    rating: 5,
    submitted_at: '2026-05-12T10:00:00Z',
    participant: { display_name: 'Asha P.', email: 'asha@example.test' },
    session: {
      id: 's1',
      title: 'May 2026 Cohort',
      facilitator: { display_name: 'Bijo A.' },
    },
  },
  {
    id: 't2',
    content: 'The Values exercise alone was worth it.',
    rating: 4,
    submitted_at: '2026-05-10T14:00:00Z',
    participant: { display_name: 'Ravi K.', email: null },
    session: {
      id: 's1',
      title: 'May 2026 Cohort',
      facilitator: { display_name: 'Bijo A.' },
    },
  },
]

let dataset: typeof sampleRows = []

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: dataset, error: null })),
      })),
    })),
  },
}))

describe('TestimonialList', () => {
  beforeEach(() => {
    dataset = [...sampleRows]
  })

  it('renders rows from supabase', async () => {
    render(<TestimonialList selectString="id" />)
    await waitFor(() => {
      expect(screen.getByText('Asha P.')).toBeInTheDocument()
    })
    expect(screen.getByText('Ravi K.')).toBeInTheDocument()
  })

  it('renders the facilitator column when requested', async () => {
    render(<TestimonialList selectString="id" showFacilitatorColumn />)
    await waitFor(() => {
      expect(screen.getAllByText('Bijo A.').length).toBeGreaterThan(0)
    })
  })

  it('expands a row when clicked to reveal full content', async () => {
    const user = userEvent.setup()
    render(<TestimonialList selectString="id" />)
    await waitFor(() => {
      expect(screen.getByText('Asha P.')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Asha P.'))
    expect(
      screen.getByText(/loved every minute of the workshop/i)
    ).toBeInTheDocument()
  })

  it('renders an empty state when there are no testimonials', async () => {
    dataset = []
    render(<TestimonialList selectString="id" />)
    await waitFor(() => {
      expect(screen.getByText(/no testimonials yet/i)).toBeInTheDocument()
    })
  })
})
