import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LifeGoalInventoryTable } from './LifeGoalInventoryTable'

const mockSave = vi.fn()

vi.mock('@/hooks/useExerciseSave', () => ({
  useExerciseSave: () => ({ save: mockSave, saveImmediate: vi.fn(), status: 'idle' }),
}))

const content = {
  prompt: 'My Life Goal Inventory',
  headers: ['Category', 'Specific Goal', 'Importance (H/M/L)', 'Ease of Attainment (H/M/L)', 'Conflict with Other Goals (Yes/No)'],
  rows: 1,
}

describe('LifeGoalInventoryTable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders category and categorical dropdowns', () => {
    render(
      <LifeGoalInventoryTable
        exerciseId="ex-life-goal"
        content={content}
        participantId="user-1"
      />
    )

    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(4)
    expect(screen.getByText('Importance')).toBeInTheDocument()
    expect(screen.getByText('Ease of Attainment')).toBeInTheDocument()
    expect(screen.getByText('A — Career Satisfaction')).toBeInTheDocument()
    expect(screen.getByText('H — Open')).toBeInTheDocument()
    expect(screen.getAllByText('High')).toHaveLength(2)
    expect(screen.getByText('Low')).toBeInTheDocument()
  })

  it('accepts text in the goal column and saves rows', async () => {
    const user = userEvent.setup()
    render(
      <LifeGoalInventoryTable
        exerciseId="ex-life-goal"
        content={content}
        participantId="user-1"
      />
    )

    await user.type(screen.getByRole('textbox'), 'Finish degree')

    expect(mockSave).toHaveBeenCalled()
    const lastCall = mockSave.mock.calls[mockSave.mock.calls.length - 1]
    expect(lastCall[0].rows[0][1]).toBe('Finish degree')
  })
})
