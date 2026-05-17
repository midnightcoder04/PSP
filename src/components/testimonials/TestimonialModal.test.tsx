import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestimonialModal } from './TestimonialModal'

const insertMock = vi.fn().mockResolvedValue({ error: null })
const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'enrollments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { session_id: 'sess-123', enrolled_at: '2026-05-01T00:00:00Z' },
            error: null,
          }),
        }
      }
      if (table === 'testimonials') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: insertMock,
          update: updateMock,
        }
      }
      return { select: vi.fn().mockReturnThis() }
    }),
  },
}))

describe('TestimonialModal', () => {
  beforeEach(() => {
    insertMock.mockClear()
    updateMock.mockClear()
  })

  it('does not render when open=false', () => {
    const { container } = render(
      <TestimonialModal open={false} participantId="p-1" onClose={() => {}} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders form fields when open', async () => {
    render(<TestimonialModal open participantId="p-1" onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText(/share your experience/i)).toBeInTheDocument()
    })
  })

  it('keeps submit disabled when content is shorter than 50 chars', async () => {
    const user = userEvent.setup()
    render(<TestimonialModal open participantId="p-1" onClose={() => {}} />)
    await waitFor(() => screen.getByLabelText(/share your experience/i))
    const textarea = screen.getByLabelText(/share your experience/i)
    await user.type(textarea, 'too short')
    const submit = screen.getByRole('button', { name: /submit|update/i })
    expect(submit).toBeDisabled()
  })

  it('enables submit and calls upsert when content meets minimum length', async () => {
    const user = userEvent.setup()
    render(<TestimonialModal open participantId="p-1" onClose={() => {}} />)
    await waitFor(() => screen.getByLabelText(/share your experience/i))
    const textarea = screen.getByLabelText(/share your experience/i)
    const longContent =
      'This is a genuinely useful workshop and I appreciated the structure and pacing.'
    await user.clear(textarea)
    await user.type(textarea, longContent)
    const submit = screen.getByRole('button', { name: /submit|update/i })
    expect(submit).not.toBeDisabled()
    await user.click(submit)
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1)
    })
    const args = insertMock.mock.calls[0][0]
    expect(args.participant_id).toBe('p-1')
    expect(args.session_id).toBe('sess-123')
    expect(args.content).toBe(longContent)
  })
})
