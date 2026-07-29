import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import type { Json, SessionCoverOverride } from '@/types/database'
import styles from './CoverOverrideModal.module.css'

interface CoverOverrideModalProps {
  sessionId: string
  sessionTitle: string
  onClose: () => void
  onSaved: () => void
}

const FIELDS: Array<{ key: keyof SessionCoverOverride; label: string; placeholder: string }> = [
  { key: 'title_line', label: 'Session title line', placeholder: 'e.g. Spring Cohort 2026' },
  { key: 'subtitle', label: 'Subtitle', placeholder: 'e.g. Two-day intensive workshop' },
  { key: 'facilitator_name', label: 'Facilitator name', placeholder: 'e.g. Bijo Abraham' },
  { key: 'date_line', label: 'Date line', placeholder: 'e.g. 12–13 July 2026' },
]

export function CoverOverrideModal({ sessionId, sessionTitle, onClose, onSaved }: CoverOverrideModalProps) {
  const [values, setValues] = useState<SessionCoverOverride>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('session_deck_overrides')
      .select('cover_json')
      .eq('session_id', sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data?.cover_json) setValues(data.cover_json as SessionCoverOverride)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [sessionId])

  async function save() {
    setSaving(true)
    setError(null)
    // Drop blank fields so the cover renderer skips them entirely
    const cover_json = Object.fromEntries(
      Object.entries(values).filter(([, v]) => typeof v === 'string' && v.trim() !== '')
    ) as Json
    const { error: err } = await supabase
      .from('session_deck_overrides')
      .upsert({ session_id: sessionId, cover_json, updated_at: new Date().toISOString() })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    onSaved()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cover-override-title"
      >
        <h2 id="cover-override-title" className={styles.modalTitle}>
          Customize cover — {sessionTitle}
        </h2>
        <p className={styles.hint}>
          These lines appear on the title slide of the presentation for this session only.
          Leave a field blank to omit it.
        </p>

        {loading ? (
          <div className={styles.loading}><Spinner size="md" /></div>
        ) : (
          <div className={styles.fields}>
            {FIELDS.map(({ key, label, placeholder }) => (
              <label key={key} className={styles.field}>
                {label}
                <input
                  type="text"
                  value={values[key] ?? ''}
                  placeholder={placeholder}
                  onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        )}

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={loading}>Save cover</Button>
        </div>
      </div>
    </div>
  )
}
