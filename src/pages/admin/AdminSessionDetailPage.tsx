import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { BulkAddModal } from '@/components/admin/BulkAddModal'
import styles from './AdminSessionDetailPage.module.css'

interface SessionInfo {
  title: string
  is_active: boolean
  scheduled_start: string | null
  scheduled_end: string | null
}

interface EnrollmentRow {
  id: string
  participant_id: string
  display_name: string
  email: string
  enrolled_at: string
}

function isSessionArchived(s: Pick<SessionInfo, 'is_active' | 'scheduled_end'>): boolean {
  return !s.is_active || (!!s.scheduled_end && new Date(s.scheduled_end) < new Date())
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export default function AdminSessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [participants, setParticipants] = useState<Array<{ id: string; display_name: string; email: string }>>([])
  const [loading, setLoading] = useState(true)
  const [selectedParticipant, setSelectedParticipant] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [showBulkAdd, setShowBulkAdd] = useState(false)

  // Date editing
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [savingDates, setSavingDates] = useState(false)

  // Archive / delete
  const [togglingArchive, setTogglingArchive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    if (!id) return
    setLoading(true)

    const [{ data: sess }, { data: enr }, { data: parts }] = await Promise.all([
      supabase.from('sessions').select('title, is_active, scheduled_start, scheduled_end').eq('id', id).single(),
      supabase.from('enrollments').select(`
        id, participant_id, enrolled_at,
        participant:profiles!participant_id(display_name, email)
      `).eq('session_id', id).eq('is_active', true),
      supabase.from('profiles').select('id, display_name, email').eq('role', 'participant').eq('is_active', true),
    ])

    setSession(sess)
    setEditStart(toDateInputValue(sess?.scheduled_start ?? null))
    setEditEnd(toDateInputValue(sess?.scheduled_end ?? null))
    setEnrollments((enr ?? []).map((e) => ({
      id: e.id,
      participant_id: e.participant_id,
      display_name: (e.participant as { display_name: string } | null)?.display_name ?? '',
      email: (e.participant as { email: string } | null)?.email ?? '',
      enrolled_at: e.enrolled_at,
    })))
    setParticipants(parts ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function enroll() {
    if (!selectedParticipant || !id) return
    setEnrolling(true)
    await supabase.from('enrollments').upsert(
      { session_id: id, participant_id: selectedParticipant, is_active: true },
      { onConflict: 'session_id,participant_id' }
    )
    setSelectedParticipant('')
    setEnrolling(false)
    load()
  }

  async function unenroll(enrollmentId: string) {
    setRemoving(enrollmentId)
    await supabase.from('enrollments').update({ is_active: false }).eq('id', enrollmentId)
    setRemoving(null)
    load()
  }

  async function saveDates() {
    if (!id || !session) return
    setSavingDates(true)
    await supabase.from('sessions').update({
      scheduled_start: editStart || null,
      scheduled_end: editEnd || null,
    }).eq('id', id)
    setSavingDates(false)
    load()
  }

  async function toggleArchive() {
    if (!id || !session) return
    setTogglingArchive(true)
    await supabase.from('sessions').update({ is_active: !session.is_active }).eq('id', id)
    setTogglingArchive(false)
    load()
  }

  async function deleteSession() {
    if (!id) return
    setDeleting(true)
    await supabase.from('sessions').delete().eq('id', id)
    navigate('/admin/sessions')
  }

  const enrolled = new Set(enrollments.map((e) => e.participant_id))
  const available = participants.filter((p) => !enrolled.has(p.id))
  const archived = session ? isSessionArchived(session) : false

  if (loading) {
    return (
      <PageShell title="Session">
        <div className={styles.loading}><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  return (
    <PageShell title={session?.title ?? 'Session'}>

      {/* ── Status bar ── */}
      <div className={styles.statusBar}>
        <Badge variant={archived ? 'muted' : 'success'}>{archived ? 'Archived' : 'Active'}</Badge>
        <Button
          variant="secondary"
          size="sm"
          loading={togglingArchive}
          onClick={toggleArchive}
        >
          {session?.is_active ? 'Archive session' : 'Unarchive session'}
        </Button>
      </div>

      {/* ── Date editing ── */}
      <div className={styles.dateRow}>
        <label className={styles.dateLabel}>
          Start
          <input
            type="date"
            className={styles.dateInput}
            value={editStart}
            onChange={(e) => setEditStart(e.target.value)}
          />
        </label>
        <label className={styles.dateLabel}>
          End
          <input
            type="date"
            className={styles.dateInput}
            value={editEnd}
            onChange={(e) => setEditEnd(e.target.value)}
          />
        </label>
        <Button size="sm" loading={savingDates} onClick={saveDates}>
          Save dates
        </Button>
      </div>

      {/* ── Enroll / bulk-add ── */}
      <div className={styles.enrollRow}>
        <select
          className={styles.select}
          value={selectedParticipant}
          onChange={(e) => setSelectedParticipant(e.target.value)}
        >
          <option value="">Add participant…</option>
          {available.map((p) => <option key={p.id} value={p.id}>{p.display_name} ({p.email})</option>)}
        </select>
        <Button onClick={enroll} loading={enrolling} disabled={!selectedParticipant}>
          Enroll
        </Button>
        <Button variant="secondary" onClick={() => setShowBulkAdd(true)}>
          Bulk add
        </Button>
      </div>

      {showBulkAdd ? (
        <BulkAddModal
          sessionId={id!}
          sessionTitle={session?.title ?? ''}
          onClose={() => setShowBulkAdd(false)}
          onAdded={() => { setShowBulkAdd(false); load() }}
        />
      ) : null}

      {enrollments.length === 0 ? (
        <div className={styles.empty}>No participants enrolled yet.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Enrolled</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id}>
                  <td>{e.display_name}</td>
                  <td>{e.email}</td>
                  <td>{new Date(e.enrolled_at).toLocaleDateString()}</td>
                  <td><Badge variant="success">Enrolled</Badge></td>
                  <td>
                    <Button variant="ghost" size="sm" loading={removing === e.id} onClick={() => unenroll(e.id)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Danger zone (only when archived) ── */}
      {archived && (
        <div className={styles.dangerZone}>
          {confirmDelete ? (
            <div className={styles.confirmDelete}>
              <p>Delete this session and all its data permanently?</p>
              <div className={styles.confirmButtons}>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button variant="danger" size="sm" loading={deleting} onClick={deleteSession}>
                  Yes, delete
                </Button>
              </div>
            </div>
          ) : (
            <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
              Delete session
            </button>
          )}
        </div>
      )}
    </PageShell>
  )
}
