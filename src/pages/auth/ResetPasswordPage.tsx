import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import { getRoleHome } from '@/lib/roleHome'
import { isValidPhone } from '@/lib/validation'
import styles from './LoginPage.module.css'

// Dual-mode page, keyed on whether a Supabase session is already present:
//   - No session: the original "request a reset link" form.
//   - Session present: "set a new password" form — reached either by an
//     account forced here by AuthGuard (must_reset_password, a temp
//     password set by a facilitator/admin) or by clicking the emailed
//     recovery link (detectSessionInUrl auto-establishes a session and
//     fires a PASSWORD_RECOVERY event). Phone is asked only if not already
//     on file, covering the forced-first-login case without re-asking
//     existing users who already have one.
export default function ResetPasswordPage() {
  const { session, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()

  // Request-link mode (no session)
  const [email, setEmail] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  // Set-password mode (session present)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('+91')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone)
  }, [profile?.phone])

  async function handleRequestLink(e: FormEvent) {
    e.preventDefault()
    setRequestLoading(true)
    setRequestError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setRequestLoading(false)
    if (resetError) {
      setRequestError(resetError.message)
    } else {
      setSent(true)
    }
  }

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (newPassword.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    const phoneRequired = !profile?.phone
    if (phoneRequired && !phone.trim()) {
      setFormError('Phone number is required.')
      return
    }
    if (phone.trim() && !isValidPhone(phone)) {
      setFormError('Please enter a valid phone number (e.g. +91 98765 43210).')
      return
    }

    setSubmitting(true)

    const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword })
    if (pwErr) {
      setSubmitting(false)
      setFormError(pwErr.message)
      return
    }

    const strippedPhone = phone.replace(/\s+/g, '')

    await supabase
      .from('profiles')
      .update({
        phone: strippedPhone || profile?.phone || null,
        must_reset_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session!.user.id)

    await refreshProfile()
    setSubmitting(false)
    navigate(getRoleHome(profile?.role ?? 'participant'), { replace: true })
  }

  if (loading || (!!session && !profile)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (session && profile) {
    const phoneRequired = !profile.phone

    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.logo}>PSP™</span>
            <h1 className={styles.title}>Set your password</h1>
            <p className={styles.subtitle}>Choose a new password to finish setting up your account</p>
          </div>

          <form onSubmit={handleSetPassword} className={styles.form} noValidate>
            {formError && <div className={styles.errorBanner} role="alert">{formError}</div>}

            <div className={styles.field}>
              <label htmlFor="new-password" className={styles.label}>New password (≥ 8 characters)</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="confirm-password" className={styles.label}>Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="phone" className={styles.label}>
                Phone number{phoneRequired ? '' : ' (optional)'}
              </label>
              <input
                id="phone"
                type="tel"
                required={phoneRequired}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={styles.input}
                placeholder="+91 98765 43210"
              />
            </div>

            <Button type="submit" loading={submitting} className={styles.submitBtn}>
              Save &amp; continue
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.logo}>PSP™</span>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--color-growth)', marginBottom: 'var(--space-4)' }}>
              Check your inbox — a reset link has been sent.
            </p>
            <Link to={ROUTES.LOGIN} style={{ color: 'var(--color-trust)' }}>Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleRequestLink} className={styles.form} noValidate>
            {requestError && <div className={styles.errorBanner} role="alert">{requestError}</div>}
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" loading={requestLoading} className={styles.submitBtn}>
              Send reset link
            </Button>
          </form>
        )}

        <div className={styles.footer}>
          <Link to={ROUTES.LOGIN} className={styles.resetLink}>Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
