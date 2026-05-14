import { PageShell } from '@/components/layout/PageShell'
import { TestimonialList } from '@/components/testimonials/TestimonialList'

const ADMIN_SELECT = `
  id,
  content,
  rating,
  submitted_at,
  participant:profiles!testimonials_participant_id_fkey ( display_name, email ),
  session:sessions (
    id,
    title,
    facilitator:profiles!sessions_facilitator_id_fkey ( display_name )
  )
`.trim()

export default function TestimonialsPage() {
  return (
    <PageShell title="Testimonials">
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
        Every testimonial submitted by participants across all sessions. Click a row to read the full content.
      </p>
      <TestimonialList selectString={ADMIN_SELECT} showFacilitatorColumn />
    </PageShell>
  )
}
