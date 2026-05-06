import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheckboxExercise } from './CheckboxExercise'

const mockSave = vi.fn()

vi.mock('@/hooks/useExerciseSave', () => ({
  useExerciseSave: () => ({ save: mockSave, saveImmediate: vi.fn(), status: 'idle' }),
}))

const content = {
  prompt: 'Select your dominant traits',
  options: [
    { id: 'opt-a', label: 'Analytical' },
    { id: 'opt-b', label: 'Bold' },
    { id: 'opt-c', label: 'Creative' },
  ],
}

const defaultProps = {
  exerciseId: 'ex-1',
  content,
  participantId: 'user-1',
}

describe('CheckboxExercise', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the prompt text', () => {
    render(<CheckboxExercise {...defaultProps} />)
    expect(screen.getByText('Select your dominant traits')).toBeInTheDocument()
  })

  it('renders all options as checkboxes', () => {
    render(<CheckboxExercise {...defaultProps} />)
    expect(screen.getByLabelText('Analytical')).toBeInTheDocument()
    expect(screen.getByLabelText('Bold')).toBeInTheDocument()
    expect(screen.getByLabelText('Creative')).toBeInTheDocument()
  })

  it('pre-checks options from initialResponse', () => {
    render(
      <CheckboxExercise
        {...defaultProps}
        initialResponse={{ selected_ids: ['opt-a', 'opt-c'] }}
      />
    )
    expect(screen.getByLabelText('Analytical')).toBeChecked()
    expect(screen.getByLabelText('Bold')).not.toBeChecked()
    expect(screen.getByLabelText('Creative')).toBeChecked()
  })

  it('toggles selection and calls save on checkbox click', async () => {
    const user = userEvent.setup()
    render(<CheckboxExercise {...defaultProps} />)

    await user.click(screen.getByLabelText('Bold'))
    expect(mockSave).toHaveBeenCalledWith(
      { selected_ids: ['opt-b'] },
      true
    )
  })

  it('deselects a previously selected option', async () => {
    const user = userEvent.setup()
    render(
      <CheckboxExercise
        {...defaultProps}
        initialResponse={{ selected_ids: ['opt-a'] }}
      />
    )

    await user.click(screen.getByLabelText('Analytical'))
    expect(mockSave).toHaveBeenCalledWith({ selected_ids: [] }, false)
  })

  it('disables checkboxes and prevents save when readOnly', async () => {
    const user = userEvent.setup()
    render(<CheckboxExercise {...defaultProps} readOnly />)

    const checkbox = screen.getByLabelText('Analytical')
    expect(checkbox).toBeDisabled()
    await user.click(checkbox)
    expect(mockSave).not.toHaveBeenCalled()
  })
})
