import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import styles from './InvitePage.module.css'

type InviteStatus = 'loading' | 'valid' | 'invalid' | 'success'

interface InviteInfo {
  session_id: string
  session_title: string
  max_uses: number
  use_count: number
  expires_at: string | null
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()

  const [status, setStatus] = useState<InviteStatus>('loading')
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [invalidReason, setInvalidReason] = useState('')

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successTitle, setSuccessTitle] = useState('')

  useEffect(() => {
    if (!token) { setStatus('invalid'); setInvalidReason('No invite token provided.'); return }

    supabase
      .from('session_invites')
      .select('session_id, max_uses, use_count, is_active, expires_at, sessions(title)')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setStatus('invalid')
          setInvalidReason('This invite link was not found.')
          return
        }

        if (!data.is_active) {
          setStatus('invalid')
          setInvalidReason('This invite link has been revoked.')
          return
        }

        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setStatus('invalid')
          setInvalidReason('This invite link has expired.')
          return
        }

        if (data.use_count >= data.max_uses) {
          setStatus('invalid')
          setInvalidReason('This invite link has reached its maximum number of registrations.')
          return
        }

        const sessionTitle = (data.sessions as { title: string } | null)?.title ?? ''
        setInvite({
          session_id: data.session_id,
          session_title: sessionTitle,
          max_uses: data.max_uses,
          use_count: data.use_count,
          expires_at: data.expires_at,
        })
        setStatus('valid')
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!email.trim() || !displayName.trim()) {
      setFormError('Email and name are required.')
      return
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    const { data, error: fnErr } = await supabase.functions.invoke('claim-invite', {
      body: { token, email: email.trim().toLowerCase(), display_name: displayName.trim(), password },
    })

    setSubmitting(false)

    if (fnErr) {
      setFormError(fnErr.message)
      return
    }

    const payload = data as { success?: boolean; session_title?: string; error?: string } | null
    if (payload?.error) {
      const msg: Record<string, string> = {
        INVITE_NOT_FOUND: 'This invite link was not found.',
        INVITE_INACTIVE: 'This invite link has been revoked.',
        INVITE_EXPIRED: 'This invite link has expired.',
        INVITE_EXHAUSTED: 'This invite link is full.',
        CREATE_FAILED: 'Could not create account. The email may already be registered.',
      }
      setFormError(msg[payload.error] ?? payload.error)
      return
    }

    setSuccessTitle(payload?.session_title ?? invite?.session_title ?? '')
    setStatus('success')
  }

  if (status === 'loading') {
    return (
      <div className={styles.centered}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className={styles.centered}>
        <div className={styles.card}>
          <h1 className={styles.title}>Link unavailable</h1>
          <p className={styles.muted}>{invalidReason}</p>
          <Link to="/login" className={styles.backLink}>Sign in</Link>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className={styles.centered}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>You're enrolled!</h1>
          {successTitle ? (
            <p className={styles.muted}>You've been added to <strong>{successTitle}</strong>.</p>
          ) : null}
          <p className={styles.muted}>Sign in to start your workshop.</p>
          <Link to="/login" className={styles.signInBtn}>
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.centered}>
      <div className={styles.card}>
        <h1 className={styles.title}>Join workshop</h1>
        {invite?.session_title ? (
          <p className={styles.sessionName}>{invite.session_title}</p>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.fieldLabel} htmlFor="inv-name">Full name</label>
          <input
            id="inv-name"
            type="text"
            className={styles.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            required
          />

          <label className={styles.fieldLabel} htmlFor="inv-email">Email</label>
          <input
            id="inv-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label className={styles.fieldLabel} htmlFor="inv-pass">Password (≥ 8 characters)</label>
          <input
            id="inv-pass"
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <label className={styles.fieldLabel} htmlFor="inv-confirm">Confirm password</label>
          <input
            id="inv-confirm"
            type="password"
            className={styles.input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          {formError ? <p className={styles.error}>{formError}</p> : null}

          <Button type="submit" loading={submitting} disabled={submitting}>
            Create account &amp; enroll
          </Button>
        </form>

        <p className={styles.loginHint}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
