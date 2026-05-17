import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SlideNav } from './SlideNav'

describe('SlideNav', () => {
  it('renders prev and next buttons', () => {
    render(<SlideNav onPrev={() => {}} onNext={() => {}} canGoPrev canGoNext />)
    expect(screen.getByRole('button', { name: /previous slide/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next slide/i })).toBeInTheDocument()
  })

  it('disables next when canGoNext is false', () => {
    render(<SlideNav onPrev={() => {}} onNext={() => {}} canGoPrev canGoNext={false} />)
    const next = screen.getByRole('button', { name: /next slide/i })
    expect(next).toBeDisabled()
  })

  it('disables prev when canGoPrev is false', () => {
    render(<SlideNav onPrev={() => {}} onNext={() => {}} canGoPrev={false} canGoNext />)
    const prev = screen.getByRole('button', { name: /previous slide/i })
    expect(prev).toBeDisabled()
  })

  it('fires onNext when next clicked', async () => {
    const user = userEvent.setup()
    const onNext = vi.fn()
    render(<SlideNav onPrev={() => {}} onNext={onNext} canGoPrev canGoNext />)
    await user.click(screen.getByRole('button', { name: /next slide/i }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('fires onPrev when prev clicked', async () => {
    const user = userEvent.setup()
    const onPrev = vi.fn()
    render(<SlideNav onPrev={onPrev} onNext={() => {}} canGoPrev canGoNext />)
    await user.click(screen.getByRole('button', { name: /previous slide/i }))
    expect(onPrev).toHaveBeenCalledTimes(1)
  })

  it('renders custom nextLabel', () => {
    render(<SlideNav onPrev={() => {}} onNext={() => {}} canGoPrev canGoNext nextLabel="Begin →" />)
    expect(screen.getByRole('button', { name: /begin/i })).toBeInTheDocument()
  })

  it('renders the gating hint with aria-live=polite when next disabled and hint provided', () => {
    render(
      <SlideNav
        onPrev={() => {}}
        onNext={() => {}}
        canGoPrev
        canGoNext={false}
        hint="Complete the exercise to continue"
      />
    )
    const hint = screen.getByText(/complete the exercise to continue/i)
    expect(hint).toBeInTheDocument()
    expect(hint).toHaveAttribute('aria-live', 'polite')
  })

  it('does not render the hint when next is enabled', () => {
    render(
      <SlideNav
        onPrev={() => {}}
        onNext={() => {}}
        canGoPrev
        canGoNext
        hint="Should not appear"
      />
    )
    expect(screen.queryByText(/should not appear/i)).not.toBeInTheDocument()
  })
})
