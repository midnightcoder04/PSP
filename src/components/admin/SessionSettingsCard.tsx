import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import type { SessionType, TrainingTopic } from '@/types/database'
import styles from './SessionSettingsCard.module.css'

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'team-based', label: 'Team-based' },
  { value: 'private-group', label: 'Private group' },
]

interface SessionSettingsCardProps {
  sessionId: string
}

/**
 * Presenter-facing session setup: the training focus topics and the session
 * type that together drive the topic-aware deck (topic inserts + the
 * team-collaboration slide for team-based sessions).
 */
export function SessionSettingsCard({ sessionId }: SessionSettingsCardProps) {
  const [sessionType, setSessionType] = useState<SessionType>('individual')
  const [restrictToValues, setRestrictToValues] = useState(false)
  const [topics, setTopics] = useState<TrainingTopic[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('sessions').select('session_type, restrict_to_values').eq('id', sessionId).single(),
      supabase.from('training_topics').select('*').eq('is_active', true).order('order_index', { ascending: true }),
      supabase.from('session_topics').select('topic_id').eq('session_id', sessionId),
    ]).then(([sessionRes, topicsRes, linkRes]) => {
      if (cancelled) return
      setSessionType((sessionRes?.data?.session_type ?? 'individual') as SessionType)
      setRestrictToValues(sessionRes?.data?.restrict_to_values ?? false)
      setTopics((topicsRes?.data ?? []) as TrainingTopic[])
      setSelected(new Set((linkRes?.data ?? []).map((r) => (r as { topic_id: string }).topic_id)))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [sessionId])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    setSaving(true)
    setStatus(null)
    const { error: typeErr } = await supabase
      .from('sessions')
      .update({ session_type: sessionType, restrict_to_values: restrictToValues })
      .eq('id', sessionId)
    if (typeErr) { setSaving(false); setStatus(`Save failed: ${typeErr.message}`); return }

    // Diff the topic links: current DB set vs. selected.
    const { data: current } = await supabase
      .from('session_topics')
      .select('topic_id')
      .eq('session_id', sessionId)
    const currentIds = new Set((current ?? []).map((r) => (r as { topic_id: string }).topic_id))
    const toAdd = [...selected].filter((id) => !currentIds.has(id))
    const toRemove = [...currentIds].filter((id) => !selected.has(id))

    if (toAdd.length > 0) {
      await supabase.from('session_topics').insert(toAdd.map((topic_id) => ({ session_id: sessionId, topic_id })))
    }
    for (const topic_id of toRemove) {
      await supabase.from('session_topics').delete().eq('session_id', sessionId).eq('topic_id', topic_id)
    }
    setSaving(false)
    setStatus('Saved')
  }

  if (loading) return null

  return (
    <section className={styles.card} aria-label="Session setup">
      <h2 className={styles.title}>Presentation setup</h2>
      <div className={styles.field}>
        <label htmlFor="session-type-select">Session type</label>
        <select
          id="session-type-select"
          className={styles.select}
          value={sessionType}
          onChange={(e) => setSessionType(e.target.value as SessionType)}
        >
          {SESSION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {sessionType === 'team-based' ? (
          <p className={styles.hint}>Shows the team-collaboration slide with limited participant profiles.</p>
        ) : null}
      </div>

      <div className={styles.field}>
        <span className={styles.legend}>Content restriction</span>
        <label className={styles.topic}>
          <input
            type="checkbox"
            checked={restrictToValues}
            onChange={(e) => setRestrictToValues(e.target.checked)}
          />
          Limit to Personality, Attitudes &amp; Values
        </label>
        {restrictToValues ? (
          <p className={styles.hint}>
            Ends the course and deck after Values and asks participants for
            feedback instead of continuing to Roles &amp; Their Demands.
          </p>
        ) : null}
      </div>

      {topics.length > 0 ? (
        <div className={styles.field}>
          <span className={styles.legend}>Focus topics</span>
          <div className={styles.topics}>
            {topics.map((t) => (
              <label key={t.id} className={styles.topic}>
                <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                {t.name}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.hint}>No active topics yet — create them under Topics.</p>
      )}

      <div className={styles.actions}>
        {status ? <span className={styles.status}>{status}</span> : null}
        <Button size="sm" onClick={save} loading={saving}>Save setup</Button>
      </div>
    </section>
  )
}
