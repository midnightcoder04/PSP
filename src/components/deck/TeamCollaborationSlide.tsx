import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { usePresentationResponses, type LiveResponseRow } from '@/hooks/usePresentationResponses'
import { resolveCoreStyleFromResponses, type CoreStyleLetter } from '@/lib/coreStyle'
import { deriveWatusiCounts, WATUSI_TIEBREAK_ORDER, type WatusiGroup } from '@/hooks/useWatusiCounts'
import styles from './TeamCollaborationSlide.module.css'

// Reuse the exact source exercises the responses panel reads, so the team view
// is derived from the same live data (no new RPC / RLS surface).
const Q1_SLUG = 'core-style-q1-extroversion'
const Q2_SLUG = 'core-style-q2-orientation'
const WATUSI_SOURCE_SLUG = 'identifying-attitudes'
const VALUES_SLUG = 'top-three-values'

export const TEAM_PROFILE_SLUGS = [Q1_SLUG, Q2_SLUG, WATUSI_SOURCE_SLUG, VALUES_SLUG]

const DISC_NAMES: Record<CoreStyleLetter, string> = {
  D: 'Dominance',
  I: 'Influence',
  S: 'Steadiness',
  C: 'Compliance',
}

const WATUSI_LABELS: Record<WatusiGroup, string> = {
  w: 'Theoretical',
  a: 'Aesthetic',
  t: 'Traditional',
  u: 'Utilitarian',
  s: 'Social',
  i: 'Individualistic',
}

export interface TeamProfile {
  participant_id: string
  name: string
  disc: { letter: CoreStyleLetter; name: string } | null
  attitude: WatusiGroup | null
  topValues: string[]
}

function firstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0]
}

/** Highest-count WATUSI group, tie-broken by canonical order; null if none. */
function topWatusiGroup(selected: string[]): WatusiGroup | null {
  const counts = deriveWatusiCounts(selected)
  let best: WatusiGroup | null = null
  for (const g of WATUSI_TIEBREAK_ORDER) {
    if (counts[g] > 0 && (best === null || counts[g] > counts[best])) best = g
  }
  return best
}

/**
 * Pure derivation of the limited per-participant profile from the live rows,
 * keyed to the four source exercises. `valueLabels` maps ranking option ids to
 * their labels (from the values exercise content_json).
 */
export function deriveTeamProfiles(
  rows: LiveResponseRow[],
  valueLabels: Map<string, string>
): TeamProfile[] {
  const byParticipant = new Map<
    string,
    { name: string; q1?: unknown; q2?: unknown; attitude?: unknown; values?: unknown }
  >()
  for (const r of rows) {
    const entry = byParticipant.get(r.participant_id) ?? { name: r.display_name }
    if (r.exercise_slug === Q1_SLUG) entry.q1 = r.response_json
    if (r.exercise_slug === Q2_SLUG) entry.q2 = r.response_json
    if (r.exercise_slug === WATUSI_SOURCE_SLUG) entry.attitude = r.response_json
    if (r.exercise_slug === VALUES_SLUG) entry.values = r.response_json
    byParticipant.set(r.participant_id, entry)
  }

  const profiles: TeamProfile[] = []
  for (const [participant_id, e] of byParticipant) {
    const disc = resolveCoreStyleFromResponses(
      (e.q1 ?? null) as { selected_ids?: string[] } | null,
      (e.q2 ?? null) as { selected_ids?: string[] } | null
    )
    const attitudeSelected = (e.attitude as { selected_ids?: string[] } | null)?.selected_ids ?? []
    const order = (e.values as { order?: string[] } | null)?.order ?? []
    const topValues = order
      .slice(0, 3)
      .map((id) => (valueLabels.get(id) ?? id).split(':')[0].trim())

    profiles.push({
      participant_id,
      name: e.name,
      disc: disc ? { letter: disc.letter, name: disc.name } : null,
      attitude: topWatusiGroup(attitudeSelected),
      topValues,
    })
  }

  profiles.sort((a, b) => a.name.localeCompare(b.name))
  return profiles
}

interface TeamCollaborationSlideProps {
  sessionId: string
  hideNames: boolean
}

export function TeamCollaborationSlide({ sessionId, hideNames }: TeamCollaborationSlideProps) {
  const { rows, loading } = usePresentationResponses({
    sessionId,
    exerciseSlugs: TEAM_PROFILE_SLUGS,
  })
  const [valueLabels, setValueLabels] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let cancelled = false
    supabase
      .from('exercises')
      .select('slug, content_json')
      .eq('slug', VALUES_SLUG)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return
        const content = data.content_json as {
          items?: { id: string; label: string }[]
          options?: { id: string; label: string }[]
        }
        const map = new Map<string, string>()
        for (const it of content?.items ?? content?.options ?? []) map.set(it.id, it.label)
        setValueLabels(map)
      })
    return () => { cancelled = true }
  }, [])

  const profiles = useMemo(() => deriveTeamProfiles(rows, valueLabels), [rows, valueLabels])

  return (
    <div className={styles.slide} data-kind="team-collaboration">
      <div className={styles.header}>
        <p className={styles.kicker}>Team collaboration</p>
        <h1 className={styles.heading}>Your team at a glance</h1>
        <p className={styles.sub}>
          {profiles.length} participant{profiles.length !== 1 ? 's' : ''} · a few insights to start the conversation
        </p>
      </div>

      {loading ? (
        <div className={styles.loading}><Spinner size="lg" /></div>
      ) : profiles.length === 0 ? (
        <p className={styles.empty}>No participants have joined yet.</p>
      ) : (
        <div className={styles.grid}>
          {profiles.map((p, i) => (
            <div key={p.participant_id} className={styles.card}>
              <p className={styles.name}>{hideNames ? `Participant ${i + 1}` : firstName(p.name)}</p>
              <dl className={styles.facts}>
                <div className={styles.fact}>
                  <dt>Core style</dt>
                  <dd>
                    {p.disc ? (
                      <span className={styles.disc} data-style={p.disc.letter}>
                        {p.disc.letter} · {p.disc.name}
                      </span>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </dd>
                </div>
                <div className={styles.fact}>
                  <dt>Attitude</dt>
                  <dd>{p.attitude ? WATUSI_LABELS[p.attitude] : <span className={styles.muted}>—</span>}</dd>
                </div>
                <div className={styles.fact}>
                  <dt>Top values</dt>
                  <dd>
                    {p.topValues.length > 0 ? (
                      <span className={styles.values}>
                        {p.topValues.map((v, j) => (
                          <span key={j} className={styles.valueChip}>{v}</span>
                        ))}
                      </span>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
