import { useEffect, useId, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Toast } from '@/components/ui/Toast'
import { CHAPTER_ORDER } from '@/lib/presentDeck'
import type { TrainingTopic, TopicSegment, TopicSegmentKind, Json } from '@/types/database'
import styles from './TopicsPage.module.css'

const CHAPTER_LABELS: Record<string, string> = {
  opening: 'Opening',
  personality: 'Personality',
  attitudes: 'Attitudes',
  values: 'Values',
  roles: 'Roles & Demands',
  skills: 'Transferable Skills',
  goals: 'Goal Setting',
  closing: 'Closing',
}

const KINDS: TopicSegmentKind[] = ['discussion', 'example', 'suggestion']

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea id={id} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

function LinesField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
}) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label} <span className={styles.hint}>one per line</span>
      </label>
      <textarea
        id={id}
        rows={5}
        value={value.join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n'))}
      />
    </div>
  )
}

// content_json helpers by kind
function segTitle(seg: TopicSegment): string {
  return ((seg.content_json as { title?: string })?.title ?? '').toString()
}
function segQuestions(seg: TopicSegment): string[] {
  return ((seg.content_json as { questions?: string[] })?.questions ?? []) as string[]
}
function segBody(seg: TopicSegment): string {
  return ((seg.content_json as { body?: string })?.body ?? '').toString()
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<TrainingTopic[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [segments, setSegments] = useState<TopicSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [savingTopic, setSavingTopic] = useState(false)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  // Topic metadata draft
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  const selected = topics.find((t) => t.id === selectedId) ?? null

  useEffect(() => {
    let cancelled = false
    supabase
      .from('training_topics')
      .select('*')
      .order('order_index', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setToast({ message: `Failed to load topics: ${error.message}`, variant: 'error' })
        else if (data && data.length > 0) {
          setTopics(data)
          setSelectedId(data[0].id)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Load the selected topic's segments + sync the metadata draft.
  useEffect(() => {
    if (!selected) return
    setName(selected.name)
    setDescription(selected.description ?? '')
    setIsActive(selected.is_active)
    let cancelled = false
    supabase
      .from('topic_segments')
      .select('*')
      .eq('topic_id', selected.id)
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setSegments((data ?? []) as TopicSegment[])
      })
    return () => { cancelled = true }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function createTopic() {
    const base = 'New topic'
    const maxOrder = topics.reduce((m, t) => Math.max(m, t.order_index), 0)
    const slug = `topic-${Date.now()}`
    const { data, error } = await supabase
      .from('training_topics')
      .insert({ slug, name: base, order_index: maxOrder + 10 })
      .select('*')
      .single()
    if (error || !data) {
      setToast({ message: `Create failed: ${error?.message ?? 'unknown'}`, variant: 'error' })
      return
    }
    setTopics((prev) => [...prev, data as TrainingTopic])
    setSelectedId((data as TrainingTopic).id)
    setSegments([])
  }

  async function saveTopic() {
    if (!selected) return
    setSavingTopic(true)
    const { error } = await supabase
      .from('training_topics')
      .update({ name: name.trim(), slug: slugify(name) || selected.slug, description: description.trim() || null, is_active: isActive })
      .eq('id', selected.id)
    setSavingTopic(false)
    if (error) { setToast({ message: `Save failed: ${error.message}`, variant: 'error' }); return }
    setTopics((prev) =>
      prev.map((t) => (t.id === selected.id ? { ...t, name: name.trim(), description: description.trim() || null, is_active: isActive } : t))
    )
    setToast({ message: 'Topic saved', variant: 'success' })
  }

  async function deleteTopic() {
    if (!selected) return
    if (!window.confirm(`Delete “${selected.name}” and all its inserts? This cannot be undone.`)) return
    const { error } = await supabase.from('training_topics').delete().eq('id', selected.id)
    if (error) { setToast({ message: `Delete failed: ${error.message}`, variant: 'error' }); return }
    const remaining = topics.filter((t) => t.id !== selected.id)
    setTopics(remaining)
    setSelectedId(remaining[0]?.id ?? null)
    setSegments([])
    setToast({ message: 'Topic deleted', variant: 'success' })
  }

  async function addSegment() {
    if (!selected) return
    const maxOrder = segments.reduce((m, s) => Math.max(m, s.order_index), 0)
    const { data, error } = await supabase
      .from('topic_segments')
      .insert({
        topic_id: selected.id,
        chapter: 'personality',
        kind: 'discussion',
        content_json: { title: '', questions: [] } as Json,
        order_index: maxOrder + 10,
      })
      .select('*')
      .single()
    if (error || !data) { setToast({ message: `Add failed: ${error?.message ?? 'unknown'}`, variant: 'error' }); return }
    setSegments((prev) => [...prev, data as TopicSegment])
  }

  function patchSegment(id: string, patch: Partial<TopicSegment>) {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  async function saveSegment(seg: TopicSegment) {
    // Normalize content by kind before persisting.
    const title = segTitle(seg)
    const content_json: Json =
      seg.kind === 'discussion'
        ? ({ title, questions: segQuestions(seg).filter((q) => q.trim() !== '') } as Json)
        : ({ title, body: segBody(seg) } as Json)
    const { error } = await supabase
      .from('topic_segments')
      .update({ chapter: seg.chapter, kind: seg.kind, content_json, order_index: seg.order_index, is_active: seg.is_active })
      .eq('id', seg.id)
    if (error) { setToast({ message: `Save failed: ${error.message}`, variant: 'error' }); return }
    patchSegment(seg.id, { content_json })
    setToast({ message: 'Insert saved', variant: 'success' })
  }

  async function deleteSegment(id: string) {
    const { error } = await supabase.from('topic_segments').delete().eq('id', id)
    if (error) { setToast({ message: `Delete failed: ${error.message}`, variant: 'error' }); return }
    setSegments((prev) => prev.filter((s) => s.id !== id))
  }

  if (loading) {
    return (
      <PageShell title="Training Topics">
        <div className={styles.loading}><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Training Topics">
      <p className={styles.lede}>
        Author the discussion questions, examples, and tips that appear on the presenter deck for
        each training focus. A session tagged with a topic shows its inserts after the matching
        course chapter.
      </p>
      <div className={styles.layout}>
        {/* ── Topic list ── */}
        <nav className={styles.topicList} aria-label="Training topics">
          <Button variant="secondary" onClick={createTopic}>+ New topic</Button>
          <ul role="list">
            {topics.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={styles.topicItem}
                  data-selected={t.id === selectedId || undefined}
                  onClick={() => setSelectedId(t.id)}
                >
                  <span>{t.name}</span>
                  {!t.is_active ? <Badge variant="muted">hidden</Badge> : null}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Editor ── */}
        {selected ? (
          <div className={styles.editor}>
            <div className={styles.editorHeader}>
              <code className={styles.slug}>{selected.slug}</code>
              <div className={styles.editorActions}>
                <Button variant="ghost" onClick={deleteTopic}>Delete topic</Button>
                <Button onClick={saveTopic} loading={savingTopic}>Save topic</Button>
              </div>
            </div>

            <TextField label="Name" value={name} onChange={setName} />
            <TextField label="Description" value={description} onChange={setDescription} multiline />
            <label className={styles.activeToggle}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active (selectable when tagging a session)
            </label>

            <div className={styles.segmentsHeader}>
              <h2 className={styles.segmentsTitle}>Deck inserts</h2>
              <Button variant="secondary" onClick={addSegment}>+ Add insert</Button>
            </div>

            {segments.length === 0 ? (
              <p className={styles.emptyNote}>No inserts yet. Add one to place content on the deck.</p>
            ) : (
              <ul role="list" className={styles.segmentList}>
                {segments.map((seg) => (
                  <li key={seg.id} className={styles.segmentCard}>
                    <div className={styles.segmentRow}>
                      <label className={styles.selectField}>
                        <span>Chapter</span>
                        <select
                          value={seg.chapter}
                          onChange={(e) => patchSegment(seg.id, { chapter: e.target.value })}
                        >
                          {CHAPTER_ORDER.map((c) => (
                            <option key={c} value={c}>{CHAPTER_LABELS[c] ?? c}</option>
                          ))}
                        </select>
                      </label>
                      <label className={styles.selectField}>
                        <span>Kind</span>
                        <select
                          value={seg.kind}
                          onChange={(e) => patchSegment(seg.id, { kind: e.target.value as TopicSegmentKind })}
                        >
                          {KINDS.map((k) => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                      </label>
                      <label className={styles.orderField}>
                        <span>Order</span>
                        <input
                          type="number"
                          value={seg.order_index}
                          onChange={(e) => patchSegment(seg.id, { order_index: Number(e.target.value) })}
                        />
                      </label>
                    </div>

                    <TextField
                      label="Title"
                      value={segTitle(seg)}
                      onChange={(v) =>
                        patchSegment(seg.id, {
                          content_json: { ...(seg.content_json as object), title: v } as Json,
                        })
                      }
                    />
                    {seg.kind === 'discussion' ? (
                      <LinesField
                        label="Questions"
                        value={segQuestions(seg)}
                        onChange={(v) =>
                          patchSegment(seg.id, {
                            content_json: { ...(seg.content_json as object), questions: v } as Json,
                          })
                        }
                      />
                    ) : (
                      <TextField
                        label="Body"
                        value={segBody(seg)}
                        multiline
                        onChange={(v) =>
                          patchSegment(seg.id, {
                            content_json: { ...(seg.content_json as object), body: v } as Json,
                          })
                        }
                      />
                    )}

                    <div className={styles.segmentActions}>
                      <label className={styles.activeToggle}>
                        <input
                          type="checkbox"
                          checked={seg.is_active}
                          onChange={(e) => patchSegment(seg.id, { is_active: e.target.checked })}
                        />
                        Active
                      </label>
                      <Button variant="ghost" onClick={() => deleteSegment(seg.id)}>Delete</Button>
                      <Button onClick={() => saveSegment(seg)}>Save insert</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className={styles.editor}>
            <p className={styles.emptyNote}>Create a topic to begin authoring inserts.</p>
          </div>
        )}
      </div>

      {toast ? <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} /> : null}
    </PageShell>
  )
}
