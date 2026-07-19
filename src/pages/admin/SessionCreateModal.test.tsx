import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionCreateModal } from './SessionCreateModal'

const state = vi.hoisted(() => ({
  inserts: [] as Array<{ table: string; payload: unknown }>,
}))

const RESULTS: Record<string, { data: unknown; error: null }> = {
  sessions: { data: { id: 's1' }, error: null },
  training_topics: {
    data: [
      { id: 't1', slug: 'leadership', name: 'Leadership', description: null, is_active: true, order_index: 10, updated_at: '' },
      { id: 't2', slug: 'sales', name: 'Sales', description: null, is_active: true, order_index: 20, updated_at: '' },
    ],
    error: null,
  },
  session_topics: { data: null, error: null },
  profiles: { data: [], error: null },
}

function tableMock(table: string) {
  const result = RESULTS[table] ?? { data: [], error: null }
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'update', 'delete', 'single', 'maybeSingle', 'in']) {
    chain[m] = vi.fn(() => chain)
  }
  chain.insert = vi.fn((payload: unknown) => {
    state.inserts.push({ table, payload })
    return chain
  })
  ;(chain as { then: unknown }).then = (resolve: (r: unknown) => unknown) => resolve(result)
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => tableMock(table) },
}))

describe('SessionCreateModal', () => {
  beforeEach(() => { state.inserts = [] })

  it('writes session_type and session_topics on create', async () => {
    const onCreated = vi.fn()
    render(
      <SessionCreateModal
        adminId="admin-1"
        lockedFacilitatorId="fac-1"
        onClose={() => {}}
        onCreated={onCreated}
      />
    )

    // Topics load asynchronously.
    await waitFor(() => expect(screen.getByText('Leadership')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/batch 7/i), 'Q3 Leadership Cohort')
    await user.selectOptions(screen.getByRole('combobox'), 'team-based')
    await user.click(screen.getByLabelText('Leadership'))
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => expect(onCreated).toHaveBeenCalled())

    const sessionInsert = state.inserts.find((i) => i.table === 'sessions')
    expect(sessionInsert?.payload).toMatchObject({
      title: 'Q3 Leadership Cohort',
      facilitator_id: 'fac-1',
      session_type: 'team-based',
    })

    const linkInsert = state.inserts.find((i) => i.table === 'session_topics')
    expect(linkInsert?.payload).toEqual([{ session_id: 's1', topic_id: 't1' }])
  })

  it('does not insert session_topics when none selected', async () => {
    render(
      <SessionCreateModal adminId="admin-1" lockedFacilitatorId="fac-1" onClose={() => {}} onCreated={vi.fn()} />
    )
    await waitFor(() => expect(screen.getByText('Leadership')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/batch 7/i), 'Solo session')
    await user.click(screen.getByRole('button', { name: /^create$/i }))
    await waitFor(() => expect(state.inserts.some((i) => i.table === 'sessions')).toBe(true))
    expect(state.inserts.some((i) => i.table === 'session_topics')).toBe(false)
  })
})
