import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RatingPickerExercise } from './RatingPickerExercise'
import type { RatingPickerContent } from '@/types/database'

const saveMock = vi.fn()
vi.mock('@/hooks/useExerciseSave', () => ({
  useExerciseSave: () => ({ save: saveMock, saveImmediate: vi.fn(), status: 'idle' }),
}))

const content: RatingPickerContent = {
  prompt: 'Rate each skill on a scale of 1 to 5.',
  scale: {
    min: 1,
    max: 5,
    labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
  },
  items: [
    { id: 's_analyzing', label: 'Analyzing' },
    { id: 's_listening', label: 'Listening' },
  ],
}

describe('RatingPickerExercise', () => {
  beforeEach(() => saveMock.mockReset())

  it('renders one fieldset per item with 5 radios each', () => {
    render(<RatingPickerExercise exerciseId="ex" participantId="p" content={content} />)
    expect(screen.getByRole('group', { name: /analyzing/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /listening/i })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(10)
  })

  it('saves with is_complete=false until every item is rated', async () => {
    const user = userEvent.setup()
    render(<RatingPickerExercise exerciseId="ex" participantId="p" content={content} />)
    const analyzingRadios = screen.getAllByRole('radio').slice(0, 5)
    await user.click(analyzingRadios[3])
    const lastCall = saveMock.mock.calls[saveMock.mock.calls.length - 1]
    expect(lastCall?.[1]).toBe(false)
  })

  it('saves with is_complete=true when every item is rated in range', async () => {
    const user = userEvent.setup()
    render(<RatingPickerExercise exerciseId="ex" participantId="p" content={content} />)
    const radios = screen.getAllByRole('radio')
    await user.click(radios[3]) // analyzing → 4
    await user.click(radios[9]) // listening → 5
    const lastCall = saveMock.mock.calls[saveMock.mock.calls.length - 1]
    expect(lastCall?.[1]).toBe(true)
    expect(lastCall?.[0]).toEqual({ ratings: { s_analyzing: 4, s_listening: 5 } })
  })

  it('rehydrates from initialResponse', () => {
    render(
      <RatingPickerExercise
        exerciseId="ex"
        participantId="p"
        content={content}
        initialResponse={{ ratings: { s_analyzing: 5, s_listening: 1 } }}
      />
    )
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios[4].checked).toBe(true) // analyzing 5
    expect(radios[5].checked).toBe(true) // listening 1
  })

  it('disables radios when readOnly', () => {
    render(
      <RatingPickerExercise
        exerciseId="ex"
        participantId="p"
        content={content}
        readOnly
      />
    )
    for (const r of screen.getAllByRole('radio')) {
      expect(r).toBeDisabled()
    }
  })
})
