import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextExercise } from './TextExercise'

const mockSave = vi.fn()

vi.mock('@/hooks/useExerciseSave', () => ({
  useExerciseSave: () => ({ save: mockSave, saveImmediate: vi.fn(), status: 'idle' }),
}))

const content = {
  prompt: 'Describe your personal values',
  placeholder: 'Write your reflection here…',
}

const defaultProps = {
  exerciseId: 'ex-text-1',
  content,
  participantId: 'user-1',
}

describe('TextExercise', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the prompt text', () => {
    render(<TextExercise {...defaultProps} />)
    expect(screen.getByText('Describe your personal values')).toBeInTheDocument()
  })

  it('renders a textarea with placeholder', () => {
    render(<TextExercise {...defaultProps} />)
    expect(screen.getByPlaceholderText('Write your reflection here…')).toBeInTheDocument()
  })

  it('pre-fills value from initialResponse', () => {
    render(
      <TextExercise
        {...defaultProps}
        initialResponse={{ value: 'Integrity is my core value.' }}
      />
    )
    expect(screen.getByRole('textbox')).toHaveValue('Integrity is my core value.')
  })

  it('updates textarea value and calls save on input change', async () => {
    const user = userEvent.setup()
    render(<TextExercise {...defaultProps} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Hello')

    expect(textarea).toHaveValue('Hello')
    expect(mockSave).toHaveBeenCalledWith({ value: 'Hello' }, true)
  })

  it('shows character count', () => {
    render(<TextExercise {...defaultProps} initialResponse={{ value: 'Hi' }} />)
    expect(screen.getByText(/2\//)).toBeInTheDocument()
  })

  it('renders read-only text instead of textarea when readOnly', () => {
    render(
      <TextExercise
        {...defaultProps}
        readOnly
        initialResponse={{ value: 'My answer' }}
      />
    )
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('My answer')).toBeInTheDocument()
  })

  it('does not call save when readOnly', async () => {
    const user = userEvent.setup()
    render(<TextExercise {...defaultProps} readOnly />)

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(mockSave).not.toHaveBeenCalled()
    await user.keyboard('test')
    expect(mockSave).not.toHaveBeenCalled()
  })

  // ── 006-iter6 / US4 — prompt parser ──────────────────────────────────────

  it('US4-a: prompt with numbered lines renders as <ol> with one <li> per item', () => {
    render(
      <TextExercise
        {...defaultProps}
        content={{ prompt: '1. first\n2. second\n3. third' }}
      />
    )
    const lis = screen.getAllByRole('listitem')
    expect(lis).toHaveLength(3)
    expect(lis[0]).toHaveTextContent('first')
    expect(lis[1]).toHaveTextContent('second')
    expect(lis[2]).toHaveTextContent('third')
    expect(lis[0].closest('ol')).not.toBeNull()
  })

  it('US4-b: prompt with bullet lines renders as <ul>', () => {
    render(
      <TextExercise
        {...defaultProps}
        content={{ prompt: '• alpha\n• beta' }}
      />
    )
    const lis = screen.getAllByRole('listitem')
    expect(lis).toHaveLength(2)
    expect(lis[0].closest('ul')).not.toBeNull()
  })

  it('US4-c: mixed prose + numbered list renders prose as <p> and list as <ol>', () => {
    render(
      <TextExercise
        {...defaultProps}
        content={{ prompt: 'Reflect on:\n1. one\n2. two\nTail prose' }}
      />
    )
    expect(screen.getByText(/Reflect on:/)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText(/Tail prose/)).toBeInTheDocument()
  })

  it('US4-d: prompt without lists renders unchanged (regression guard)', () => {
    render(
      <TextExercise
        {...defaultProps}
        content={{ prompt: 'Describe your personal values' }}
      />
    )
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(screen.getByText('Describe your personal values')).toBeInTheDocument()
  })
})
