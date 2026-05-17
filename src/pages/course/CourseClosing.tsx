import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageShell } from '@/components/layout/PageShell'
import { TestimonialModal } from '@/components/testimonials/TestimonialModal'
import { ROUTES } from '@/lib/constants'
import styles from './CourseClosing.module.css'

export default function CourseClosing() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <PageShell title="Course Complete">
      <div className={styles.container}>
        <h2 className={styles.headline}>Congratulations, {profile?.display_name ?? 'friend'}.</h2>
        <p className={styles.subtitle}>
          You've completed all five filters and the Goal Setting section. The plan
          you've written is yours — read it again in a week, again in a month, and
          watch how it sharpens.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setModalOpen(true)}
          >
            Leave a testimonial
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => navigate(ROUTES.COURSE)}
          >
            Back to My Course
          </button>
        </div>

        <p className={styles.attribution}>
          Personal Strategic Planning™ — © Sam Koshy / Compass Career Life Solutions, Canada. All
          rights reserved. Workshop facilitated by Bijo Abraham (Career &amp; Life Strategist),
          Rise with PSP™.
        </p>
      </div>

      {profile && (
        <TestimonialModal
          open={modalOpen}
          participantId={profile.id}
          onClose={() => setModalOpen(false)}
        />
      )}
    </PageShell>
  )
}
