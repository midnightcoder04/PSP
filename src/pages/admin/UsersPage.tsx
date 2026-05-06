import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import type { Profile } from '@/types/database'
import styles from './UsersPage.module.css'

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setProfiles(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(id: string, current: boolean) {
    setToggling(id)
    await supabase
      .from('profiles')
      .update({ is_active: !current, updated_at: new Date().toISOString() })
      .eq('id', id)
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p))
    )
    setToggling(null)
  }

  if (loading) {
    return (
      <PageShell title="Users">
        <div className={styles.loading}><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Users">
      <div className={styles.toolbar}>
        <p className={styles.count}>{profiles.length} users</p>
      </div>

      {profiles.length === 0 ? (
        <div className={styles.empty}>
          <p>No users yet. Users are created when accounts are provisioned through Supabase Admin.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className={!p.is_active ? styles.inactive : ''}>
                  <td className={styles.name}>{p.display_name}</td>
                  <td className={styles.email}>{p.email}</td>
                  <td><Badge variant={p.role === 'admin' ? 'info' : p.role === 'facilitator' ? 'warning' : 'muted'}>{p.role}</Badge></td>
                  <td><Badge variant={p.is_active ? 'success' : 'error'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td className={styles.date}>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={toggling === p.id}
                      onClick={() => toggleActive(p.id, p.is_active)}
                    >
                      {p.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  )
}
