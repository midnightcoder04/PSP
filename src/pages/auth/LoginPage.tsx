import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const role = profile?.role ?? 'participant'
      const roleHome = role === 'admin' ? ROUTES.ADMIN : role === 'facilitator' ? ROUTES.FACILITATOR : ROUTES.COURSE
      navigate(from ?? roleHome, { replace: true })
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.logo}>Rise with PSP™</span>
          <h1 className={styles.title}>Personal Strategic Planning</h1>
          <p className={styles.subtitle}>Sign in to continue your journey</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}
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
          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" loading={loading} className={styles.submitBtn}>
            Sign in
          </Button>
        </form>

        <div className={styles.footer}>
          <a href={ROUTES.RESET_PASSWORD} className={styles.resetLink}>
            Forgot password?
          </a>
        </div>
      </div>
      <p className={styles.attribution}>
        Personal Strategic Planning™ — © Sam Koshy / Compass Career Life Solutions · Facilitated by Rise with PSP™
      </p>
    </div>
  )
}
