import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import styles from './UserCreateModal.module.css'

type Role = 'admin' | 'facilitator' | 'participant'

interface UserCreateModalProps {
  onClose: () => void
  onCreated: () => void
}

export function UserCreateModal({ onClose, onCreated }: UserCreateModalProps) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<Role>('participant')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName = displayName.trim()
    if (!trimmedEmail || !trimmedName || password.length < 8) return
    setSubmitting(true)
    setError(null)

    const { data, error: fnError } = await supabase.functions.invoke('create-user', {
      body: {
        email: trimmedEmail,
        display_name: trimmedName,
        role,
        password,
      },
    })

    setSubmitting(false)
    if (fnError) {
      setError(fnError.message)
      return
    }
    const errPayload = (data as { error?: string; detail?: string } | null)
    if (errPayload?.error) {
      setError(errPayload.detail ? `${errPayload.error}: ${errPayload.detail}` : errPayload.error)
      return
    }
    onCreated()
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-create-title"
      >
        <h2 id="user-create-title" className={styles.modalTitle}>
          Add user
        </h2>
        <p className={styles.helpText}>
          Creates a confirmed account on the hosted Supabase project and sets the role
          atomically. Share the password with the invitee out-of-band; they can change it
          on their first sign-in.
        </p>

        <div className={styles.modalForm}>
          <label htmlFor="cu-email">Email</label>
          <input
            id="cu-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="off"
          />

          <label htmlFor="cu-name">Display name</label>
          <input
            id="cu-name"
            className={styles.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Full name"
          />

          <label htmlFor="cu-role">Role</label>
          <select
            id="cu-role"
            className={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="participant">Participant</option>
            <option value="facilitator">Facilitator</option>
            <option value="admin">Admin</option>
          </select>

          <label htmlFor="cu-pass">Initial password (≥ 8 chars)</label>
          <input
            id="cu-pass"
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Temporary password"
            autoComplete="new-password"
          />
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            loading={submitting}
            disabled={
              !email.trim() || !displayName.trim() || password.length < 8 || submitting
            }
          >
            Create user
          </Button>
        </div>
      </div>
    </div>
  )
}
