import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import styles from './DeleteUserModal.module.css'

interface Props {
  userId: string
  displayName: string
  email: string
  onClose: () => void
  onDeleted: () => void
}

export function DeleteUserModal({ userId, displayName, email, onClose, onDeleted }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)

    const { data, error: fnErr } = await supabase.functions.invoke('delete-user', {
      body: { user_id: userId },
    })

    // supabase.functions.invoke wraps non-2xx responses in a FunctionsHttpError
    // with a generic message. Extract the actual JSON body from error.context.
    let errCode: string | null = null
    if (fnErr) {
      try {
        const body = await (fnErr as unknown as { context: Response }).context.json()
        errCode = body?.error ?? fnErr.message
      } catch {
        errCode = fnErr.message
      }
    } else if (data?.error) {
      errCode = data.error
    }

    if (errCode) {
      setError(
        errCode === 'USER_MUST_BE_DEACTIVATED_FIRST'
          ? 'User must be deactivated before deletion.'
          : errCode === 'CANNOT_DELETE_SELF'
          ? 'You cannot delete your own account.'
          : `Delete failed: ${errCode}`
      )
      setLoading(false)
      return
    }

    onDeleted()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.icon}>⚠</div>
        <h2 className={styles.title}>Delete user permanently?</h2>
        <p className={styles.body}>
          You are about to permanently delete <strong>{displayName}</strong> ({email}).
          This will remove their account, all progress, and enrollment history.
          <strong className={styles.irreversible}> This cannot be undone.</strong>
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onClick={handleDelete}>
            Delete permanently
          </Button>
        </div>
      </div>
    </div>
  )
}
