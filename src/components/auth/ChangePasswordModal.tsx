import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import styles from './ChangePasswordModal.module.css'

interface ChangePasswordModalProps {
  onClose: () => void
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (updateErr) {
      setError(updateErr.message)
      return
    }

    setSuccess(true)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-pass-title"
      >
        <h2 id="change-pass-title" className={styles.title}>Change password</h2>

        {success ? (
          <>
            <p className={styles.successMsg}>Password updated successfully.</p>
            <div className={styles.actions}>
              <Button onClick={onClose}>Close</Button>
            </div>
          </>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className={styles.label} htmlFor="cp-pass">New password (≥ 8 chars)</label>
            <input
              id="cp-pass"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <label className={styles.label} htmlFor="cp-confirm">Confirm new password</label>
            <input
              id="cp-confirm"
              type="password"
              className={styles.input}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.actions}>
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting || password.length < 8 || confirm.length < 8}
              >
                Update password
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
