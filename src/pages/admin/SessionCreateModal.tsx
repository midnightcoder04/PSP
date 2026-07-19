import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import type { SessionType, TrainingTopic } from '@/types/database'
import styles from './SessionCreateModal.module.css'

interface SessionCreateModalProps {
  adminId: string
  lockedFacilitatorId?: string
  onClose: () => void
  onCreated: () => void
}

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: 'individual', label: 'Individual — private per-participant work' },
  { value: 'team-based', label: 'Team-based — show the team-collaboration slide' },
  { value: 'private-group', label: 'Private group — group session, no team view' },
]

export function SessionCreateModal({ adminId, lockedFacilitatorId, onClose, onCreated }: SessionCreateModalProps) {
  const [title, setTitle] = useState('')
  const [facilitatorId, setFacilitatorId] = useState(lockedFacilitatorId ?? '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sessionType, setSessionType] = useState<SessionType>('individual')
  const [topics, setTopics] = useState<TrainingTopic[]>([])
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set())
  const [facilitators, setFacilitators] = useState<Array<{ id: string; display_name: string }>>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (lockedFacilitatorId) return
    supabase
      .from('profiles')
      .select('id, display_name')
      .eq('role', 'facilitator')
      .eq('is_active', true)
      .then(({ data }) => setFacilitators(data ?? []))
  }, [lockedFacilitatorId])

  useEffect(() => {
    supabase
      .from('training_topics')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
      .then(({ data }) => setTopics((data ?? []) as TrainingTopic[]))
  }, [])

  function toggleTopic(id: string) {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCreate() {
    if (!title.trim() || !facilitatorId) return
    setSaving(true)
    setError(null)
    const { data, error: insertError } = await supabase
      .from('sessions')
      .insert({
        title: title.trim(),
        facilitator_id: facilitatorId,
        scheduled_start: startDate || null,
        scheduled_end: endDate || null,
        session_type: sessionType,
        created_by: adminId,
      })
      .select('id')
      .single()
    if (insertError || !data) { setSaving(false); setError(insertError?.message ?? 'Create failed'); return }

    if (selectedTopicIds.size > 0) {
      const { error: linkError } = await supabase
        .from('session_topics')
        .insert([...selectedTopicIds].map((topic_id) => ({ session_id: data.id, topic_id })))
      if (linkError) { setSaving(false); setError(linkError.message); return }
    }
    setSaving(false)
    onCreated()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>New Session</h2>
        <div className={styles.modalForm}>
          <label>Title</label>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Batch 7 — May 2026"
          />
          {!lockedFacilitatorId && (
            <>
              <label>Facilitator</label>
              <select
                className={styles.input}
                value={facilitatorId}
                onChange={(e) => setFacilitatorId(e.target.value)}
              >
                <option value="">Select facilitator…</option>
                {facilitators.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.display_name}
                  </option>
                ))}
              </select>
            </>
          )}
          <label>Start Date</label>
          <input
            type="date"
            className={styles.input}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <label>End Date</label>
          <input
            type="date"
            className={styles.input}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <label>Session Type</label>
          <select
            className={styles.input}
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as SessionType)}
          >
            {SESSION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {topics.length > 0 ? (
            <>
              <label>Focus Topics</label>
              <div className={styles.topicList}>
                {topics.map((t) => (
                  <label key={t.id} className={styles.topicOption}>
                    <input
                      type="checkbox"
                      checked={selectedTopicIds.has(t.id)}
                      onChange={() => toggleTopic(t.id)}
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </>
          ) : null}
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            loading={saving}
            disabled={!title.trim() || (!lockedFacilitatorId && !facilitatorId)}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}
