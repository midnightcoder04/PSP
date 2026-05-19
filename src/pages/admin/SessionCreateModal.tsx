import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import styles from './SessionCreateModal.module.css'

interface SessionCreateModalProps {
  adminId: string
  lockedFacilitatorId?: string
  onClose: () => void
  onCreated: () => void
}

export function SessionCreateModal({ adminId, lockedFacilitatorId, onClose, onCreated }: SessionCreateModalProps) {
  const [title, setTitle] = useState('')
  const [facilitatorId, setFacilitatorId] = useState(lockedFacilitatorId ?? '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [facilitators, setFacilitators] = useState<Array<{ id: string; display_name: string }>>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (lockedFacilitatorId) return
    supabase
      .from('profiles')
      .select('id, display_name')
      .eq('role', 'facilitator')
      .eq('is_active', true)
      .then(({ data }) => setFacilitators(data ?? []))
  }, [lockedFacilitatorId])

  async function handleCreate() {
    if (!title.trim() || !facilitatorId) return
    setSaving(true)
    await supabase.from('sessions').insert({
      title: title.trim(),
      facilitator_id: facilitatorId,
      scheduled_start: startDate || null,
      scheduled_end: endDate || null,
      created_by: adminId,
    })
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
        </div>
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
