import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageShell } from '@/components/layout/PageShell'
import { Spinner } from '@/components/ui/Spinner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import styles from './AdminDashboard.module.css'

interface Overview {
  total_sessions: number
  active_sessions: number
  total_participants: number
  overall_completion_pct: number
  sections: Array<{ slug: string; title: string; avg_completion_pct: number }>
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .rpc('get_admin_overview')
      .then(({ data }) => {
        setOverview(data as unknown as Overview)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <PageShell title="Admin Dashboard">
        <div className={styles.loading}><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  const stats = [
    { label: 'Total Sessions',    value: overview?.total_sessions ?? 0 },
    { label: 'Active Sessions',   value: overview?.active_sessions ?? 0 },
    { label: 'Total Participants',value: overview?.total_participants ?? 0 },
    { label: 'Overall Completion',value: `${overview?.overall_completion_pct ?? 0}%` },
  ]

  const chartData = (overview?.sections ?? []).map((s) => ({
    name: s.title,
    pct: s.avg_completion_pct ?? 0,
  }))

  return (
    <PageShell title="Admin Dashboard">
      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <p className={styles.statLabel}>{stat.label}</p>
            <p className={styles.statValue}>{stat.value}</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Average Section Completion (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Avg Completion']} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="var(--color-trust)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </PageShell>
  )
}
