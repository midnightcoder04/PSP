import { PageShell } from '@/components/layout/PageShell'
import { TestimonialList } from '@/components/testimonials/TestimonialList'

const FACILITATOR_SELECT = `
  id,
  content,
  rating,
  submitted_at,
  participant:profiles!testimonials_participant_id_fkey ( display_name ),
  session:sessions ( id, title, facilitator_id )
`.trim()

export default function FacilitatorTestimonialsPage() {
  return (
    <PageShell title="Testimonials from My Sessions">
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
        Testimonials from participants enrolled in sessions you facilitate. Click a row to read the full content.
      </p>
      <TestimonialList selectString={FACILITATOR_SELECT} />
    </PageShell>
  )
}
