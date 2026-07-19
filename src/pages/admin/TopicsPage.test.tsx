import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TopicsPage from './TopicsPage'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: { id: 'admin-1', display_name: 'Admin', role: 'admin' }, signOut: vi.fn(), loading: false }),
}))

const state = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; op: string; payload?: unknown }>,
}))

const TOPIC = { id: 't1', slug: 'leadership', name: 'Leadership', description: null, is_active: true, order_index: 10, updated_at: '' }
const SEGMENT = {
  id: 'seg1',
  topic_id: 't1',
  chapter: 'personality',
  kind: 'discussion',
  content_json: { title: 'Leading across styles', questions: ['Why differ?'] },
  order_index: 10,
  is_active: true,
  updated_at: '',
}

const RESULTS: Record<string, { select: unknown; insert: unknown }> = {
  training_topics: { select: { data: [TOPIC], error: null }, insert: { data: { ...TOPIC, id: 't2', name: 'New topic' }, error: null } },
  topic_segments: {
    select: { data: [SEGMENT], error: null },
    insert: { data: { ...SEGMENT, id: 'seg2', content_json: { title: '', questions: [] } }, error: null },
  },
}

function tableMock(table: string) {
  const r = RESULTS[table] ?? { select: { data: [], error: null }, insert: { data: null, error: null } }
  let mode: 'select' | 'insert' = 'select'
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'update', 'delete', 'single', 'maybeSingle', 'in']) {
    chain[m] = vi.fn(() => {
      if (m === 'delete') state.calls.push({ table, op: 'delete' })
      return chain
    })
  }
  chain.insert = vi.fn((payload: unknown) => {
    mode = 'insert'
    state.calls.push({ table, op: 'insert', payload })
    return chain
  })
  ;(chain as { then: unknown }).then = (resolve: (r: unknown) => unknown) =>
    resolve(mode === 'insert' ? r.insert : r.select)
  return chain
}

vi.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => tableMock(table) } }))

function renderPage() {
  return render(
    <MemoryRouter>
      <TopicsPage />
    </MemoryRouter>
  )
}

describe('TopicsPage', () => {
  beforeEach(() => { state.calls = [] })

  it('lists topics and the selected topic’s inserts', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByDisplayValue('Leading across styles')).toBeInTheDocument())
    // topic name appears in the list button
    expect(screen.getAllByText('Leadership').length).toBeGreaterThan(0)
  })

  it('adds an insert via the topic_segments table', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByDisplayValue('Leading across styles')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /add insert/i }))
    await waitFor(() =>
      expect(state.calls.some((c) => c.table === 'topic_segments' && c.op === 'insert')).toBe(true)
    )
  })

  it('deletes an insert', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByDisplayValue('Leading across styles')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() =>
      expect(state.calls.some((c) => c.table === 'topic_segments' && c.op === 'delete')).toBe(true)
    )
  })
})
