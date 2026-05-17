import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TableExercise } from './TableExercise'

const mockSave = vi.fn()

vi.mock('@/hooks/useExerciseSave', () => ({
  useExerciseSave: () => ({ save: mockSave, saveImmediate: vi.fn(), status: 'idle' }),
}))

const content = {
  prompt: 'List your transferable skills',
  headers: ['Skill', 'Proficiency', 'Enjoyment'],
  rows: 2,
}

const valuesContent = {
  prompt: 'Values Shopping Spree',
  headers: ['#', 'Item', 'Amount Budgeted ($)'],
  rows: 2,
  col_types: ['number', 'text', 'currency'] as const,
  total_target: 100000,
  items: ['A process guaranteed to rid the world of prejudice and racism.', 'An opportunity to help the sick and impoverished and allow them happier lives.'],
}

const defaultProps = {
  exerciseId: 'ex-table-1',
  content,
  participantId: 'user-1',
}

describe('TableExercise', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the prompt', () => {
    render(<TableExercise {...defaultProps} />)
    expect(screen.getByText('List your transferable skills')).toBeInTheDocument()
  })

  it('renders column headers', () => {
    render(<TableExercise {...defaultProps} />)
    expect(screen.getByText('Skill')).toBeInTheDocument()
    expect(screen.getByText('Proficiency')).toBeInTheDocument()
    expect(screen.getByText('Enjoyment')).toBeInTheDocument()
  })

  it('renders the correct number of input rows', () => {
    render(<TableExercise {...defaultProps} />)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(content.rows * content.headers.length)
  })

  it('pre-fills cells from initialResponse', () => {
    render(
      <TableExercise
        {...defaultProps}
        initialResponse={{ rows: [['Leadership', 'High', '9'], ['Communication', 'Medium', '7']] }}
      />
    )
    expect(screen.getByDisplayValue('Leadership')).toBeInTheDocument()
    expect(screen.getByDisplayValue('High')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Communication')).toBeInTheDocument()
  })

  it('accepts cell input and calls save with updated rows', async () => {
    const user = userEvent.setup()
    render(<TableExercise {...defaultProps} />)

    const firstInput = screen.getAllByRole('textbox')[0]
    await user.type(firstInput, 'Teamwork')

    expect(mockSave).toHaveBeenCalledWith(
      { rows: expect.arrayContaining([expect.arrayContaining(['Teamwork'])]) },
      true
    )
  })

  it('renders static text instead of inputs when readOnly', () => {
    render(
      <TableExercise
        {...defaultProps}
        readOnly
        initialResponse={{ rows: [['Analysis', 'High', '8'], ['Planning', 'High', '9']] }}
      />
    )
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('Analysis')).toBeInTheDocument()
  })

  it('renders values shopping spree items as fixed rows', () => {
    render(<TableExercise {...defaultProps}  />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText(valuesContent.items[0])).toBeInTheDocument()
    expect(screen.getByText(valuesContent.items[1])).toBeInTheDocument()
    expect(screen.getAllByRole('spinbutton')).toHaveLength(valuesContent.rows)
  })
})
