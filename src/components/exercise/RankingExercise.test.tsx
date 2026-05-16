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

  // ── 005-iter5-ux-fixes / US4 — WATUSI count freshness ────────────────
  // Per spec.md §FR-030/FR-031/FR-040 and contracts/personality-exercises.md.

  const watusiContent = {
    prompt: 'WATUSI ranking — derived from upstream checklist',
    interaction: 'buttons' as const,
    show_counts: true,
    derives_from: {
      source_exercise_slug: 'identifying-attitudes',
      group_by: 'id_prefix' as const,
    },
    items: [
      { id: 'attitude_w', label: 'W — Theoretical' },
      { id: 'attitude_a', label: 'A — Aesthetic' },
      { id: 'attitude_t', label: 'T — Traditional' },
      { id: 'attitude_u', label: 'U — Utilitarian' },
      { id: 'attitude_s', label: 'S — Social' },
      { id: 'attitude_i', label: 'I — Individualistic' },
    ],
  }

  function checklistResponse(checked: string[]) {
    return {
      id: 'resp-checklist',
      participant_id: 'user-1',
      exercise_id: 'ex-checklist',
      session_id: null,
      response_json: { checked },
      is_complete: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
  }

  it('FR-030: count badges recompute when derivesFromResponse changes mid-render', async () => {
    const initialResp = checklistResponse(['w_1'])
    const { rerender } = render(
      <RankingExercise
        {...defaultProps}
        content={watusiContent}
        derivesFromResponse={initialResp}
      />
    )
    // First render: W has 1 tick
    expect(screen.getByLabelText('Count: 1')).toBeInTheDocument()

    // Simulate upstream tick: 3 W-items now checked
    const updatedResp = checklistResponse(['w_1', 'w_2', 'w_3'])
    rerender(
      <RankingExercise
        {...defaultProps}
        content={watusiContent}
        derivesFromResponse={updatedResp}
      />
    )
    // Count badge MUST reflect new derive on this render commit
    expect(screen.getByLabelText('Count: 3')).toBeInTheDocument()
  })

  it('FR-040b: count badges populate from CheckboxExercise selected_ids shape', () => {
    // Prod shape: CheckboxExercise persists `{ selected_ids: [...] }`. Earlier
    // RankingExercise only read `checked`, so counts silently stayed at zero.
    const prodShape = {
      id: 'resp-checklist',
      participant_id: 'user-1',
      exercise_id: 'ex-checklist',
      session_id: null,
      response_json: { selected_ids: ['w_1', 'w_2', 'a_10'] },
      is_complete: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    render(
      <RankingExercise
        {...defaultProps}
        content={watusiContent}
        derivesFromResponse={prodShape}
      />
    )
    expect(screen.getByLabelText('Count: 2')).toBeInTheDocument() // W
    expect(screen.getByLabelText('Count: 1')).toBeInTheDocument() // A
  })

  it('FR-040: count badges are hidden when count is zero (R5 decision)', () => {
    // No upstream checks → every group has count 0 → no badges rendered
    render(
      <RankingExercise
        {...defaultProps}
        content={watusiContent}
        derivesFromResponse={checklistResponse([])}
      />
    )
    expect(screen.queryByLabelText(/Count:/)).not.toBeInTheDocument()
  })

  it('FR-033: any reorder click persists is_complete=true so the slide gate can advance', async () => {
    const user = userEvent.setup()
    render(<RankingExercise {...defaultProps} />)

    const moveDownButtons = screen.getAllByRole('button', { name: /move.*down/i })
    await user.click(moveDownButtons[0])

    // Inspect every save() call — at least one MUST persist is_complete=true.
    const completeCalls = mockSave.mock.calls.filter((c) => c[1] === true)
    expect(completeCalls.length).toBeGreaterThan(0)
  })
})
