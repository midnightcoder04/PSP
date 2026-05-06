import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RankingExercise } from './RankingExercise'

const mockSave = vi.fn()

vi.mock('@/hooks/useExerciseSave', () => ({
  useExerciseSave: () => ({ save: mockSave, saveImmediate: vi.fn(), status: 'idle' }),
}))

const content = {
  prompt: 'Rank your top values',
  items: [
    { id: 'val-1', label: 'Integrity' },
    { id: 'val-2', label: 'Freedom' },
    { id: 'val-3', label: 'Growth' },
  ],
}

const defaultProps = {
  exerciseId: 'ex-rank-1',
  content,
  participantId: 'user-1',
}

describe('RankingExercise', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the prompt', () => {
    render(<RankingExercise {...defaultProps} />)
    expect(screen.getByText('Rank your top values')).toBeInTheDocument()
  })

  it('renders all items in default order', () => {
    render(<RankingExercise {...defaultProps} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Integrity')
    expect(items[1]).toHaveTextContent('Freedom')
    expect(items[2]).toHaveTextContent('Growth')
  })

  it('renders items in initialResponse order when provided', () => {
    render(
      <RankingExercise
        {...defaultProps}
        initialResponse={{ order: ['val-3', 'val-1', 'val-2'] }}
      />
    )
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Growth')
    expect(items[1]).toHaveTextContent('Integrity')
    expect(items[2]).toHaveTextContent('Freedom')
  })

  it('moves item up and calls save with new order', async () => {
    const user = userEvent.setup()
    render(<RankingExercise {...defaultProps} />)

    const moveUpButtons = screen.getAllByRole('button', { name: /move.*up/i })
    await user.click(moveUpButtons[1]) // Move "Freedom" up

    expect(mockSave).toHaveBeenCalledWith(
      { order: ['val-2', 'val-1', 'val-3'] },
      true
    )
  })

  it('moves item down and calls save with new order', async () => {
    const user = userEvent.setup()
    render(<RankingExercise {...defaultProps} />)

    const moveDownButtons = screen.getAllByRole('button', { name: /move.*down/i })
    await user.click(moveDownButtons[0]) // Move "Integrity" down

    expect(mockSave).toHaveBeenCalledWith(
      { order: ['val-2', 'val-1', 'val-3'] },
      true
    )
  })

  it('disables up button for first item', () => {
    render(<RankingExercise {...defaultProps} />)
    const moveUpButtons = screen.getAllByRole('button', { name: /move.*up/i })
    expect(moveUpButtons[0]).toBeDisabled()
  })

  it('disables down button for last item', () => {
    render(<RankingExercise {...defaultProps} />)
    const moveDownButtons = screen.getAllByRole('button', { name: /move.*down/i })
    expect(moveDownButtons[moveDownButtons.length - 1]).toBeDisabled()
  })

  it('hides reorder buttons and prevents save when readOnly', async () => {
    const user = userEvent.setup()
    render(<RankingExercise {...defaultProps} readOnly />)

    expect(screen.queryByRole('button', { name: /move/i })).not.toBeInTheDocument()
    await user.keyboard('{ArrowUp}')
    expect(mockSave).not.toHaveBeenCalled()
  })
})
