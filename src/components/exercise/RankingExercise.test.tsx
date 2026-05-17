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

  // ── 006-iter6 / US1 — Read-only sorted interaction mode ──────────────────
  // Per contracts/ranking-read-only.md §Test matrix (T1, T2, T3, T4, T5, T6).

  const sortedWatusiContent = {
    ...watusiContent,
    interaction: 'sorted' as const,
  }

  function watusiSelectedIdsResponse(selected_ids: string[]) {
    return {
      id: 'resp-checklist',
      participant_id: 'user-1',
      exercise_id: 'ex-checklist',
      session_id: null,
      response_json: { selected_ids },
      is_complete: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
  }

  it("T1 (US1): interaction='sorted' + no initialResponse calls save once with {order: derived, is_complete: true}", () => {
    render(
      <RankingExercise
        {...defaultProps}
        content={sortedWatusiContent}
        derivesFromResponse={watusiSelectedIdsResponse(['w_1', 'w_2', 'a_10'])}
      />
    )
    expect(mockSave).toHaveBeenCalledTimes(1)
    const [payload, isComplete] = mockSave.mock.calls[0]
    expect(isComplete).toBe(true)
    expect(payload.order[0]).toBe('attitude_w') // W has highest count
    expect(payload.order[1]).toBe('attitude_a')
  })

  it("T2 (US1): interaction='sorted' + initialResponse present does NOT call save", () => {
    render(
      <RankingExercise
        {...defaultProps}
        content={sortedWatusiContent}
        initialResponse={{ order: ['attitude_w', 'attitude_a', 'attitude_t', 'attitude_u', 'attitude_s', 'attitude_i'] }}
        derivesFromResponse={watusiSelectedIdsResponse(['w_1'])}
      />
    )
    expect(mockSave).not.toHaveBeenCalled()
  })

  it("T2b (US1): interaction='sorted' ignores stale saved order and still sorts by live counts", () => {
    render(
      <RankingExercise
        {...defaultProps}
        content={sortedWatusiContent}
        initialResponse={{ order: ['attitude_i', 'attitude_s', 'attitude_u', 'attitude_t', 'attitude_a', 'attitude_w'] }}
        derivesFromResponse={watusiSelectedIdsResponse(['a_10', 'a_11', 'a_12', 'w_1'])}
      />
    )

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(/A —/)
    expect(items[1]).toHaveTextContent(/W —/)
  })

  it("T3 (US1): interaction='sorted' re-derives order when derivesFromResponse changes", () => {
    const { rerender } = render(
      <RankingExercise
        {...defaultProps}
        content={sortedWatusiContent}
        derivesFromResponse={watusiSelectedIdsResponse(['w_1'])}
      />
    )
    let items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(/W —/)

    rerender(
      <RankingExercise
        {...defaultProps}
        content={sortedWatusiContent}
        derivesFromResponse={watusiSelectedIdsResponse(['a_10', 'a_11', 'a_12'])}
      />
    )
    items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(/A —/) // A now leads with 3 ticks
  })

  it("T4 (US1): interaction='sorted' + readOnly=true suppresses auto-complete-on-mount", () => {
    render(
      <RankingExercise
        {...defaultProps}
        content={sortedWatusiContent}
        readOnly
        derivesFromResponse={watusiSelectedIdsResponse(['w_1'])}
      />
    )
    expect(mockSave).not.toHaveBeenCalled()
  })

  it("T5 (US2): interaction='sorted' count chip uses the .countBadge class (CSS pins position:static + margin-left:auto)", () => {
    render(
      <RankingExercise
        {...defaultProps}
        content={sortedWatusiContent}
        derivesFromResponse={watusiSelectedIdsResponse(['w_1', 'a_10'])}
      />
    )
    const chip = screen.getAllByLabelText(/Count: /)[0] as HTMLElement
    // jsdom doesn't apply CSS modules, so we assert by class presence; the
    // CSS rule (position: static; margin-left: auto; flex-shrink: 0) is
    // verified by reading RankingExercise.module.css → covered by T017.
    expect(chip.className).toMatch(/countBadge/)
    // Defensive: no inline style override forcing position to absolute/fixed.
    expect(chip.style.position).not.toMatch(/absolute|fixed/)
  })

  it("T5b (user request): interaction='sorted' shows a count summary at the top", () => {
    render(
      <RankingExercise
        {...defaultProps}
        content={sortedWatusiContent}
        derivesFromResponse={watusiSelectedIdsResponse(['w_1', 'w_2', 'a_10'])}
      />
    )

    const summary = screen.getByLabelText('WATUSI counts summary')
    expect(summary).toBeInTheDocument()
    expect(summary).toHaveTextContent('W')
    expect(summary).toHaveTextContent('2')
  })

  it("T6 (US1): interaction='sorted' renders no drag-handle and no rank cell", () => {
    const { container } = render(
      <RankingExercise
        {...defaultProps}
        content={sortedWatusiContent}
        derivesFromResponse={watusiSelectedIdsResponse(['w_1'])}
      />
    )
    // No drag handle character "⋮⋮"
    expect(container.textContent).not.toContain('⋮⋮')
    // No up/down move buttons
    expect(screen.queryByRole('button', { name: /move/i })).not.toBeInTheDocument()
    // No element labelled by class containing "rank" — sorted rows show no #
    const rankCells = container.querySelectorAll('[class*=rank]')
    expect(rankCells.length).toBe(0)
  })

  const valuesContent = {
    prompt: 'What Do I Value?',
    interaction: 'sorted' as const,
    show_counts: true,
    derives_from: {
      source_exercise_slug: 'values-shopping-spree',
      group_by: 'values_pair_sum' as const,
    },
    items: [
      { id: 'val_justice', label: 'Justice' },
      { id: 'val_humanitarianism', label: 'Humanitarianism' },
    ],
  }

  function valuesShoppingResponse(rows: string[][]) {
    return {
      id: 'resp-values',
      participant_id: 'user-1',
      exercise_id: 'ex-values',
      session_id: null,
      response_json: { rows },
      is_complete: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
  }

  it("values ranking sorts by combined spending and shows dollar badges", () => {
    render(
      <RankingExercise
        {...defaultProps}
        content={valuesContent}
        derivesFromResponse={valuesShoppingResponse([
          ['1', 'Item 1', '10000'],
          ['2', 'Item 2', '5000'],
          ['3', 'Item 18', '25000'],
          ['4', 'Item 19', '1000'],
        ])}
      />
    )

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Justice')
    expect(items[0]).toHaveTextContent('$35,000')
    expect(items[1]).toHaveTextContent('Humanitarianism')
    expect(items[1]).toHaveTextContent('$6,000')
  })
})
