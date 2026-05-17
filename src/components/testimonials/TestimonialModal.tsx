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

      // Best-effort: resolve most recent active enrollment → session_id.
      // If no enrollment exists (self-directed participant) we continue with
      // session_id = null so they can still leave a testimonial.
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('session_id')
        .eq('participant_id', participantId)
        .eq('is_active', true)
        .order('enrolled_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const sid = enrollment?.session_id ?? null
      setSessionId(sid)

      // Look for an existing testimonial for this participant + session combo
      const query = supabase
        .from('testimonials')
        .select('*')
        .eq('participant_id', participantId)

      const { data: row } = await (sid
        ? query.eq('session_id', sid)
        : query.is('session_id', null)
      ).maybeSingle()

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
  const canSubmit = contentLen >= MIN_LEN && contentLen <= MAX_LEN && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    let err: { message: string } | null = null

    if (existing?.id) {
      const { error: upErr } = await supabase
        .from('testimonials')
        .update({ content: draft.content.trim(), rating: draft.rating })
        .eq('id', existing.id)
      err = upErr
    } else {
      const { error: insErr } = await supabase
        .from('testimonials')
        .insert({
          participant_id: participantId,
          session_id: sessionId,
          content: draft.content.trim(),
          rating: draft.rating,
        })
      err = insErr
    }

    setSubmitting(false)
    if (err) {
      setError(err.message)
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
