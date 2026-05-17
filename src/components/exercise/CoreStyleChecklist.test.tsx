import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoreStyleChecklist } from './CoreStyleChecklist'
import type { CoreStyleChecklistContent, Response } from '@/types/database'

const mockSave = vi.fn()
vi.mock('@/hooks/useExerciseSave', () => ({
  useExerciseSave: () => ({ save: mockSave, saveImmediate: vi.fn(), status: 'idle' }),
}))

const content: CoreStyleChecklistContent = {
  prompt: 'Tick the traits that resonate (optional).',
  allow_multiple: true,
  computed: 'core_style_options',
  computed_inputs: ['q1-id', 'q2-id'],
  options_by_style: {
    D: [
      { id: 'd_t1', label: 'Ambitious' },
      { id: 'd_t2', label: 'Forceful' },
      { id: 'd_t3', label: 'Decisive' },
    ],
    I: [
      { id: 'i_t1', label: 'Expressive' },
      { id: 'i_t2', label: 'Enthusiastic' },
      { id: 'i_t3', label: 'Friendly' },
    ],
    S: [
      { id: 's_t1', label: 'Methodical' },
      { id: 's_t2', label: 'Systematic' },
      { id: 's_t3', label: 'Reliable' },
    ],
    C: [
      { id: 'c_t1', label: 'Analytical' },
      { id: 'c_t2', label: 'Precise' },
      { id: 'c_t3', label: 'Thorough' },
    ],
  },
}

function resp(exerciseId: string, selected_ids: string[]): Response {
  return {
    id: `resp-${exerciseId}`,
    participant_id: 'user-1',
    exercise_id: exerciseId,
    session_id: null,
    response_json: { selected_ids } as Response['response_json'],
    is_complete: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

const defaultProps = {
  exerciseId: 'ex-traits-1',
  content,
  participantId: 'user-1',
}

describe('CoreStyleChecklist', () => {
  beforeEach(() => vi.clearAllMocks())

  it('P2: quiz resolves to I → renders options_by_style.I and persists ticks', async () => {
    const user = userEvent.setup()
    render(
      <CoreStyleChecklist
        {...defaultProps}
        q1Response={resp('q1-id', ['q1_extroverted'])}
        q2Response={resp('q2-id', ['q2_people'])}
      />
    )
    expect(screen.getByText('Expressive')).toBeInTheDocument()
    expect(screen.getByText('Enthusiastic')).toBeInTheDocument()
    expect(screen.queryByLabelText('Attitude group counts')).not.toBeInTheDocument()
    // HIGH-D/S/C options must NOT be in the DOM
    expect(screen.queryByText('Ambitious')).not.toBeInTheDocument()
    expect(screen.queryByText('Methodical')).not.toBeInTheDocument()
    expect(screen.queryByText('Analytical')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/Expressive/))
    expect(mockSave).toHaveBeenCalledWith({ selected_ids: ['i_t1'] }, true)
  })

  it('P3-checklist: missing quiz response renders fallback prompt and no checkboxes', () => {
    render(<CoreStyleChecklist {...defaultProps} q1Response={null} q2Response={null} />)
    expect(screen.getByText(/Answer the two questions/)).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('P3-checklist: q1 missing also triggers fallback', () => {
    render(
      <CoreStyleChecklist
        {...defaultProps}
        q1Response={null}
        q2Response={resp('q2-id', ['q2_task'])}
      />
    )
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('quiz resolves to D + initialResponse → pre-fills ticks from response', () => {
    render(
      <CoreStyleChecklist
        {...defaultProps}
        q1Response={resp('q1-id', ['q1_extroverted'])}
        q2Response={resp('q2-id', ['q2_task'])}
        initialResponse={{ selected_ids: ['d_t1', 'd_t3'] }}
      />
    )
    const cb1 = screen.getByLabelText(/Ambitious/) as HTMLInputElement
    const cb2 = screen.getByLabelText(/Forceful/) as HTMLInputElement
    const cb3 = screen.getByLabelText(/Decisive/) as HTMLInputElement
    expect(cb1.checked).toBe(true)
    expect(cb2.checked).toBe(false)
    expect(cb3.checked).toBe(true)
  })
})
