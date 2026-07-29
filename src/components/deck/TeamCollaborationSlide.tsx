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
// The participant's ranked values live on the `what-do-i-value` ranking
// exercise (`{ order: [...] }`, auto-saved from the Values Shopping Spree
// totals). `top-three-values` is a structured-text reflection (`{ answers }`)
// and never carries an order — reading it here left the column permanently
// empty.
const VALUES_SLUG = 'what-do-i-value'
// `what-do-i-value` only auto-saves its order once the participant reaches that
// slide, so we also read the upstream spree and recompute the pair sums when the
// ranking row is missing — same math as RankingExercise's `values_pair_sum`.
const VALUES_SOURCE_SLUG = 'values-shopping-spree'

/** How many WATUSI attitudes / values to surface per participant. */
const TOP_N = 3

export const TEAM_PROFILE_SLUGS = [
  Q1_SLUG,
  Q2_SLUG,
  WATUSI_SOURCE_SLUG,
  VALUES_SLUG,
  VALUES_SOURCE_SLUG,
]

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
  topAttitudes: WatusiGroup[]
  topValues: string[]
}

function firstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0]
}

/** Top-N WATUSI groups by count, tie-broken by canonical order; [] if none. */
function topWatusiGroups(selected: string[]): WatusiGroup[] {
  const counts = deriveWatusiCounts(selected)
  return [...WATUSI_TIEBREAK_ORDER]
    .filter((g) => counts[g] > 0)
    .sort(
      (a, b) =>
        counts[b] - counts[a] ||
        WATUSI_TIEBREAK_ORDER.indexOf(a) - WATUSI_TIEBREAK_ORDER.indexOf(b)
    )
    .slice(0, TOP_N)
}

/**
 * Ranking labels read "Justice — Moral rightness, honor, fairness (Items 1 + 18)";
 * the chips only want the value name. Mirrors SectionPage's `short()` helper and
 * still tolerates the older "Name: gloss" form.
 */
function shortValueLabel(raw: string) {
  return raw.split(/\s+[—–-]\s+|:/)[0].trim()
}

/**
 * Value ids ordered by spend, recomputed from the Values Shopping Spree table.
 * Each value pairs two spree rows (item i and item i + itemCount); the amount is
 * the row's last cell. Mirrors `values_pair_sum` in RankingExercise so the
 * fallback ranks identically to the one the participant would have saved.
 */
function orderFromSpree(
  spree: unknown,
  valueItems: { id: string; label: string }[]
): string[] {
  const spreeRows = (spree as { rows?: string[][] } | null)?.rows ?? []
  if (spreeRows.length === 0 || valueItems.length === 0) return []
  const pairCount = valueItems.length
  const amount = (row: string[] | undefined) => {
    const cleaned = String(row?.[(row?.length ?? 0) - 1] ?? '').replace(/[\s,$]/g, '')
    const parsed = parseFloat(cleaned)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const totals = new Map(
    valueItems.map((item, index) => [
      item.id,
      amount(spreeRows[index]) + amount(spreeRows[index + pairCount]),
    ])
  )
  if ([...totals.values()].every((t) => t === 0)) return []
  return valueItems
    .map((item, index) => ({ id: item.id, index }))
    .sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0) || a.index - b.index)
    .map((entry) => entry.id)
}

/**
 * Pure derivation of the limited per-participant profile from the live rows,
 * keyed to the source exercises. `valueItems` is the `what-do-i-value` ranking's
 * ordered options (from its content_json) — used both to label ids and to
 * recompute the ranking from the spree when no ranking row exists yet.
 */
export function deriveTeamProfiles(
  rows: LiveResponseRow[],
  valueItems: { id: string; label: string }[]
): TeamProfile[] {
  const valueLabels = new Map(valueItems.map((i) => [i.id, i.label]))
  const byParticipant = new Map<
    string,
    {
      name: string
      q1?: unknown
      q2?: unknown
      attitude?: unknown
      values?: unknown
      spree?: unknown
    }
  >()
  for (const r of rows) {
    const entry = byParticipant.get(r.participant_id) ?? { name: r.display_name }
    if (r.exercise_slug === Q1_SLUG) entry.q1 = r.response_json
    if (r.exercise_slug === Q2_SLUG) entry.q2 = r.response_json
    if (r.exercise_slug === WATUSI_SOURCE_SLUG) entry.attitude = r.response_json
    if (r.exercise_slug === VALUES_SLUG) entry.values = r.response_json
    if (r.exercise_slug === VALUES_SOURCE_SLUG) entry.spree = r.response_json
    byParticipant.set(r.participant_id, entry)
  }

  const profiles: TeamProfile[] = []
  for (const [participant_id, e] of byParticipant) {
    const disc = resolveCoreStyleFromResponses(
      (e.q1 ?? null) as { selected_ids?: string[] } | null,
      (e.q2 ?? null) as { selected_ids?: string[] } | null
    )
    // CheckboxExercise persists `selected_ids`; older payloads used `checked`.
    const attitudePayload = e.attitude as { selected_ids?: string[]; checked?: string[] } | null
    const attitudeSelected = attitudePayload?.selected_ids ?? attitudePayload?.checked ?? []
    const savedOrder = (e.values as { order?: string[] } | null)?.order ?? []
    const order = savedOrder.length > 0 ? savedOrder : orderFromSpree(e.spree, valueItems)
    const topValues = order
      .slice(0, TOP_N)
      .map((id) => shortValueLabel(valueLabels.get(id) ?? id))

    profiles.push({
      participant_id,
      name: e.name,
      disc: disc ? { letter: disc.letter, name: disc.name } : null,
      topAttitudes: topWatusiGroups(attitudeSelected),
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
  // Ordered — the spree fallback pairs value i with spree rows i and i + N, so
  // the declaration order in content_json is load-bearing, not just a label map.
  const [valueItems, setValueItems] = useState<{ id: string; label: string }[]>([])

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
        setValueItems(content?.items ?? content?.options ?? [])
      })
    return () => { cancelled = true }
  }, [])

  const profiles = useMemo(() => deriveTeamProfiles(rows, valueItems), [rows, valueItems])

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
                  <dt>Top attitudes</dt>
                  <dd>
                    {p.topAttitudes.length > 0 ? (
                      <ol className={styles.ranked}>
                        {p.topAttitudes.map((g) => (
                          <li key={g}>{WATUSI_LABELS[g]}</li>
                        ))}
                      </ol>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </dd>
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
