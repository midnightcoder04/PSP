import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeckPdfButton } from './DeckPdfButton'

const mockSlides = [
  {
    id: 's1',
    slug: 'opening-cover',
    kind: 'cover',
    chapter: 'opening',
    order_index: 10,
    content_json: { title: 'Personal Strategic Planning™' },
    linked_exercise_slugs: [],
    notes: null,
    updated_at: '2026-07-10T00:00:00Z',
  },
  {
    id: 's2',
    slug: 'values-title',
    kind: 'section-title',
    chapter: 'values',
    order_index: 20,
    content_json: { title: 'MY VALUES' },
    linked_exercise_slugs: [],
    notes: null,
    updated_at: '2026-07-10T00:00:00Z',
  },
]

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'deck_slides') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockSlides, error: null }),
        }
      }
      if (table === 'sessions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { title: 'Spring Cohort', session_type: 'individual' },
            error: null,
          }),
        }
      }
      if (table === 'session_topics') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      // session_deck_overrides
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
  },
}))

describe('DeckPdfButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts every slide and opens the print dialog when downloading a PDF', async () => {
    const user = userEvent.setup()
    const print = vi.fn()
    vi.stubGlobal('print', print)
    // jsdom has no rAF-driven paint; run the callback immediately.
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })

    try {
      render(<DeckPdfButton sessionId="sess-1" />)
      await user.click(screen.getByRole('button', { name: /download pdf/i }))

      await waitFor(() => expect(print).toHaveBeenCalled())
      // The whole deck is mounted, not just one slide.
      expect(screen.getByText('Personal Strategic Planning™')).toBeInTheDocument()
      expect(screen.getByText('MY VALUES')).toBeInTheDocument()
    } finally {
      raf.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  // WebKit and the macOS print path mishandle @page in a body-level <style>,
  // rotating the landscape page box onto portrait paper. It belongs in <head>.
  it('injects the landscape @page rule into <head>, and removes it after', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('print', vi.fn())
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })

    try {
      render(<DeckPdfButton sessionId="sess-1" />)
      await user.click(screen.getByRole('button', { name: /download pdf/i }))
      await screen.findByText('MY VALUES')

      const atPage = [...document.head.querySelectorAll('style')].filter((s) =>
        s.textContent?.includes('@page')
      )
      expect(atPage).toHaveLength(1)
      expect(atPage[0].textContent).toContain('landscape')
      expect(document.body.querySelector('style')?.textContent ?? '').not.toContain('@page')

      act(() => {
        window.dispatchEvent(new Event('afterprint'))
      })

      await waitFor(() =>
        expect(
          [...document.head.querySelectorAll('style')].filter((s) =>
            s.textContent?.includes('@page')
          )
        ).toHaveLength(0)
      )
    } finally {
      raf.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it('unmounts the print deck once the print dialog closes', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('print', vi.fn())
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })

    try {
      render(<DeckPdfButton sessionId="sess-1" />)
      await user.click(screen.getByRole('button', { name: /download pdf/i }))
      await screen.findByText('MY VALUES')

      act(() => {
        window.dispatchEvent(new Event('afterprint'))
      })

      await waitFor(() => expect(screen.queryByText('MY VALUES')).not.toBeInTheDocument())
    } finally {
      raf.mockRestore()
      vi.unstubAllGlobals()
    }
  })
})
