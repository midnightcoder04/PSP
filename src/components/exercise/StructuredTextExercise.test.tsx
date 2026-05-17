import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StructuredTextExercise } from './StructuredTextExercise'
import type { StructuredTextContent } from '@/types/database'

const saveMock = vi.fn()
vi.mock('@/hooks/useExerciseSave', () => ({
  useExerciseSave: () => ({ save: saveMock, saveImmediate: vi.fn(), status: 'idle' }),
}))

const content: StructuredTextContent = {
  prompt: 'Answer the three questions below.',
  questions: [
    { id: 'q1', label: 'What is your name?', min_length: 1 },
    { id: 'q2', label: 'Where do you live?', min_length: 5 },
    { id: 'q3', label: 'Optional reflection?', min_length: 0 },
  ],
}

describe('StructuredTextExercise', () => {
  beforeEach(() => saveMock.mockReset())

  it('renders one textarea per question with its label', () => {
    render(
      <StructuredTextExercise
        exerciseId="ex-1"
        participantId="p-1"
        content={content}
      />
    )
    expect(screen.getByLabelText('What is your name?')).toBeInTheDocument()
    expect(screen.getByLabelText('Where do you live?')).toBeInTheDocument()
    expect(screen.getByLabelText('Optional reflection?')).toBeInTheDocument()
  })

  it('renders the prompt', () => {
    render(
      <StructuredTextExercise
        exerciseId="ex-1"
        participantId="p-1"
        content={content}
      />
    )
    expect(screen.getByText('Answer the three questions below.')).toBeInTheDocument()
  })

  it('saves with is_complete=false until every required question meets min_length', async () => {
    const user = userEvent.setup()
    render(
      <StructuredTextExercise
        exerciseId="ex-1"
        participantId="p-1"
        content={content}
      />
    )
    await user.type(screen.getByLabelText('What is your name?'), 'J')
    await new Promise((r) => setTimeout(r, 350))
    const lastCall = saveMock.mock.calls[saveMock.mock.calls.length - 1]
    expect(lastCall?.[1]).toBe(false)
  })

  it('saves with is_complete=true when all required questions are filled', async () => {
    const user = userEvent.setup()
    render(
      <StructuredTextExercise
        exerciseId="ex-1"
        participantId="p-1"
        content={content}
      />
    )
    await user.type(screen.getByLabelText('What is your name?'), 'Jane')
    await user.type(screen.getByLabelText('Where do you live?'), 'Mumbai')
    await new Promise((r) => setTimeout(r, 350))
    const lastCall = saveMock.mock.calls[saveMock.mock.calls.length - 1]
    expect(lastCall?.[1]).toBe(true)
    expect(lastCall?.[0]).toMatchObject({
      answers: { q1: 'Jane', q2: 'Mumbai' },
    })
  })

  it('rehydrates from initialResponse', () => {
    render(
      <StructuredTextExercise
        exerciseId="ex-1"
        participantId="p-1"
        content={content}
        initialResponse={{ answers: { q1: 'Carla', q2: 'Berlin', q3: '' } }}
      />
    )
    expect(screen.getByLabelText('What is your name?')).toHaveValue('Carla')
    expect(screen.getByLabelText('Where do you live?')).toHaveValue('Berlin')
  })

  it('shows the legacy banner when _legacy is present', () => {
    render(
      <StructuredTextExercise
        exerciseId="ex-1"
        participantId="p-1"
        content={content}
        initialResponse={{ answers: {}, _legacy: 'My previous free-text answer.' }}
      />
    )
    expect(screen.getByText(/previous answer preserved/i)).toBeInTheDocument()
    expect(screen.getByText(/my previous free-text answer/i)).toBeInTheDocument()
  })

  it('is read-only when readOnly prop is true', () => {
    render(
      <StructuredTextExercise
        exerciseId="ex-1"
        participantId="p-1"
        content={content}
        readOnly
      />
    )
    expect(screen.getByLabelText('What is your name?')).toBeDisabled()
  })
})
