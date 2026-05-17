import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import styles from './TestimonialList.module.css'

export interface TestimonialListRow {
  id: string
  content: string
  rating: number | null
  submitted_at: string
  participant: { display_name: string; email?: string | null } | null
  session: {
    id: string
    title: string
    facilitator?: { display_name: string } | null
  } | null
}

interface TestimonialListProps {
  /**
   * supabase-js select string. Caller controls scope; RLS filters automatically.
   */
  selectString: string
  showFacilitatorColumn?: boolean
}

export function TestimonialList({
  selectString,
  showFacilitatorColumn = false,
}: TestimonialListProps) {
  const [rows, setRows] = useState<TestimonialListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    const { data, error: fetchErr } = await supabase
      .from('testimonials')
      .select(selectString)
      .order('submitted_at', { ascending: false })
    if (fetchErr) {
      setError(fetchErr.message)
    } else {
      setRows((data ?? []) as unknown as TestimonialListRow[])
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectString])

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return <p className={styles.error}>Error loading testimonials: {error}</p>
  }

  if (rows.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No testimonials yet.</p>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.refreshBtn} onClick={refresh}>
          Refresh
        </button>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Participant</th>
            {showFacilitatorColumn && <th>Facilitator</th>}
            <th>Session</th>
            <th>Rating</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = expanded === row.id
            return (
              <>
                <tr
                  key={row.id}
                  className={styles.row}
                  onClick={() => setExpanded((id) => (id === row.id ? null : row.id))}
                >
                  <td>{row.participant?.display_name ?? '—'}</td>
                  {showFacilitatorColumn && (
                    <td>{row.session?.facilitator?.display_name ?? '—'}</td>
                  )}
                  <td>{row.session?.title ?? '—'}</td>
                  <td>{row.rating != null ? `${row.rating} / 5` : '—'}</td>
                  <td>{new Date(row.submitted_at).toLocaleDateString()}</td>
                </tr>
                {isOpen && (
                  <tr key={`${row.id}-expand`} className={styles.expandRow}>
                    <td colSpan={showFacilitatorColumn ? 5 : 4}>
                      <blockquote className={styles.quote}>{row.content}</blockquote>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
