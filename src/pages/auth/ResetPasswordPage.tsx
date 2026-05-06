import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import styles from './LoginPage.module.css'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (resetError) {
      setError(resetError.message)
    } else {
      setSent(true)
    }
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
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {error && <div className={styles.errorBanner} role="alert">{error}</div>}
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
            <Button type="submit" loading={loading} className={styles.submitBtn}>
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
