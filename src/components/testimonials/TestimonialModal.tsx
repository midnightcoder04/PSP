import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Testimonial } from '@/types/database'
import styles from './TestimonialModal.module.css'

interface TestimonialModalProps {
  open: boolean
  participantId: string
  onClose: () => void
}

interface DraftState {
  content: string
  rating: number | null
}

const MIN_LEN = 50
const MAX_LEN = 1500

export function TestimonialModal({ open, participantId, onClose }: TestimonialModalProps) {
  const [draft, setDraft] = useState<DraftState>({ content: '', rating: null })
  const [existing, setExisting] = useState<Testimonial | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!open) return

    async function load() {
      setLoading(true)
      setError(null)

      // Resolve most recent active enrollment → session_id
      const { data: enrollment, error: enrErr } = await supabase
        .from('enrollments')
        .select('session_id, enrolled_at')
        .eq('participant_id', participantId)
        .eq('is_active', true)
        .order('enrolled_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (enrErr) {
        setError(enrErr.message)
        setLoading(false)
        return
      }

      if (!enrollment) {
        setError('No active session — please contact your facilitator.')
        setSessionId(null)
        setLoading(false)
        return
      }

      setSessionId(enrollment.session_id)

      // Prefill existing testimonial (if any)
      const { data: row } = await supabase
        .from('testimonials')
        .select('*')
        .eq('participant_id', participantId)
        .eq('session_id', enrollment.session_id)
        .maybeSingle()

      if (row) {
        setExisting(row)
        setDraft({ content: row.content, rating: row.rating })
      } else {
        setExisting(null)
        setDraft({ content: '', rating: null })
      }
      setLoading(false)
    }

    load()
  }, [open, participantId])

  if (!open) return null

  const contentLen = draft.content.trim().length
  const canSubmit = !!sessionId && contentLen >= MIN_LEN && contentLen <= MAX_LEN && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionId || !canSubmit) return
    setSubmitting(true)
    setError(null)
    const { error: upErr } = await supabase
      .from('testimonials')
      .upsert(
        {
          participant_id: participantId,
          session_id: sessionId,
          content: draft.content.trim(),
          rating: draft.rating,
        },
        { onConflict: 'participant_id,session_id' }
      )
    setSubmitting(false)
    if (upErr) {
      setError(upErr.message)
      return
    }
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      onClose()
    }, 1200)
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Leave a testimonial">
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {existing ? 'Update your testimonial' : 'Leave a testimonial'}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading…</p>
        ) : error ? (
          <div>
            <p className={styles.error}>{error}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : success ? (
          <p className={styles.success}>Thank you — your testimonial has been saved.</p>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <label htmlFor="testimonial-content" className={styles.label}>
              Share your experience with the workshop
              <span className={styles.charCount}>
                {contentLen} / {MAX_LEN}
                {contentLen < MIN_LEN && ` (min ${MIN_LEN})`}
              </span>
            </label>
            <textarea
              id="testimonial-content"
              className={styles.textarea}
              value={draft.content}
              onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
              maxLength={MAX_LEN}
              rows={6}
              required
              minLength={MIN_LEN}
            />

            <fieldset className={styles.ratingGroup}>
              <legend className={styles.label}>Rating (optional)</legend>
              <div className={styles.starRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={styles.starBtn}
                    data-selected={draft.rating != null && n <= draft.rating}
                    aria-label={`${n} stars`}
                    onClick={() =>
                      setDraft((d) => ({ ...d, rating: d.rating === n ? null : n }))
                    }
                  >
                    ★
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={!canSubmit}
              >
                {submitting ? 'Saving…' : existing ? 'Update' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
