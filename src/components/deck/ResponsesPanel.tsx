import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { usePresentationResponses, type LiveResponseRow } from '@/hooks/usePresentationResponses'
import { resolveCoreStyleFromResponses, type CoreStyleLetter } from '@/lib/coreStyle'
import { deriveWatusiCounts, WATUSI_TIEBREAK_ORDER, type WatusiGroup } from '@/hooks/useWatusiCounts'
import type {
  PresentedSlide,
  Json,
  StructuredTextContent,
  StructuredTextResponse,
  TableResponse,
  RatingPickerResponse,
} from '@/types/database'
import styles from './ResponsesPanel.module.css'

const Q1_SLUG = 'core-style-q1-extroversion'
const Q2_SLUG = 'core-style-q2-orientation'
const WATUSI_SOURCE_SLUG = 'identifying-attitudes'

const WATUSI_LABELS: Record<WatusiGroup, string> = {
  w: 'W — Theoretical',
  a: 'A — Aesthetic',
  t: 'T — Traditional',
  u: 'U — Utilitarian',
  s: 'S — Social',
  i: 'I — Individualistic',
}

const DISC_NAMES: Record<CoreStyleLetter, string> = {
  D: 'Dominance',
  I: 'Influence',
  S: 'Steadiness',
  C: 'Compliance',
}

interface ExerciseMeta {
  slug: string
  title: string
  type: string
  content_json: Json
}

interface ResponsesPanelProps {
  sessionId: string
  slide: PresentedSlide
  hideNames: boolean
  onToggleHideNames: () => void
  onClose: () => void
}

function firstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0]
}

function optionLabels(meta: ExerciseMeta | undefined): Map<string, string> {
  const map = new Map<string, string>()
  const content = meta?.content_json as { options?: { id: string; label: string }[]; items?: { id: string; label: string }[] } | undefined
  for (const entry of content?.options ?? content?.items ?? []) {
    map.set(entry.id, entry.label)
  }
  return map
}

function NameChips({ names, hidden }: { names: string[]; hidden: boolean }) {
  if (hidden || names.length === 0) return null
  return (
    <span className={styles.chips}>
      {names.map((n, i) => (
        <span key={i} className={styles.chip}>{n}</span>
      ))}
    </span>
  )
}

function Bar({ label, count, max, names, hidden, accent }: {
  label: string
  count: number
  max: number
  names: string[]
  hidden: boolean
  accent?: string
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className={styles.barRow}>
      <div className={styles.barHeader}>
        <span className={styles.barLabel}>{label}</span>
        <span className={styles.barCount}>{count}</span>
      </div>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${pct}%`, ...(accent ? { background: accent } : {}) }}
        />
      </div>
      <NameChips names={names} hidden={hidden} />
    </div>
  )
}

// ── Per-type renderers ─────────────────────────────────────

function DiscDistribution({ rows, hideNames }: { rows: LiveResponseRow[]; hideNames: boolean }) {
  const byParticipant = new Map<string, { name: string; q1?: Json | null; q2?: Json | null }>()
  for (const r of rows) {
    const entry = byParticipant.get(r.participant_id) ?? { name: r.display_name }
    if (r.exercise_slug === Q1_SLUG) entry.q1 = r.response_json
    if (r.exercise_slug === Q2_SLUG) entry.q2 = r.response_json
    byParticipant.set(r.participant_id, entry)
  }

  const buckets: Record<CoreStyleLetter, string[]> = { D: [], I: [], S: [], C: [] }
  let resolved = 0
  for (const { name, q1, q2 } of byParticipant.values()) {
    const style = resolveCoreStyleFromResponses(
      (q1 ?? null) as { selected_ids?: string[] } | null,
      (q2 ?? null) as { selected_ids?: string[] } | null
    )
    if (style) {
      buckets[style.letter].push(firstName(name))
      resolved += 1
    }
  }
  const max = Math.max(...Object.values(buckets).map((n) => n.length), 1)

  return (
    <div className={styles.section}>
      <p className={styles.sectionNote}>
        Core styles resolved for {resolved} of {byParticipant.size} participants
      </p>
      {(['D', 'I', 'S', 'C'] as const).map((letter) => (
        <div key={letter} data-style={letter} className={styles.discBar}>
          <Bar
            label={`${letter} — ${DISC_NAMES[letter]}`}
            count={buckets[letter].length}
            max={max}
            names={buckets[letter]}
            hidden={hideNames}
          />
        </div>
      ))}
    </div>
  )
}

function WatusiDistribution({ rows }: { rows: LiveResponseRow[] }) {
  const totals: Record<WatusiGroup, number> = { w: 0, a: 0, t: 0, u: 0, s: 0, i: 0 }
  let answered = 0
  for (const r of rows) {
    const selected = (r.response_json as { selected_ids?: string[] } | null)?.selected_ids
    if (!selected) continue
    answered += 1
    const counts = deriveWatusiCounts(selected)
    for (const g of WATUSI_TIEBREAK_ORDER) totals[g] += counts[g]
  }
  const max = Math.max(...Object.values(totals), 1)

  return (
    <div className={styles.section}>
      <p className={styles.sectionNote}>Combined attitude selections across {answered} participants</p>
      {WATUSI_TIEBREAK_ORDER.map((g) => (
        <Bar key={g} label={WATUSI_LABELS[g]} count={totals[g]} max={max} names={[]} hidden />
      ))}
    </div>
  )
}

function CheckboxAggregate({ rows, meta, hideNames }: {
  rows: LiveResponseRow[]
  meta: ExerciseMeta | undefined
  hideNames: boolean
}) {
  const labels = optionLabels(meta)
  const counts = new Map<string, string[]>()
  for (const r of rows) {
    const selected = (r.response_json as { selected_ids?: string[] } | null)?.selected_ids ?? []
    for (const id of selected) {
      const names = counts.get(id) ?? []
      names.push(firstName(r.display_name))
      counts.set(id, names)
    }
  }
  // Preserve option order from content where known, append unknown ids after
  const ids = [...labels.keys()].filter((id) => counts.has(id))
  for (const id of counts.keys()) if (!ids.includes(id)) ids.push(id)
  const max = Math.max(...[...counts.values()].map((n) => n.length), 1)

  if (ids.length === 0) return <p className={styles.emptyNote}>No selections yet.</p>
  return (
    <div className={styles.section}>
      {ids.map((id) => (
        <Bar
          key={id}
          label={labels.get(id) ?? id}
          count={counts.get(id)?.length ?? 0}
          max={max}
          names={counts.get(id) ?? []}
          hidden={hideNames}
        />
      ))}
    </div>
  )
}

function RankingAggregate({ rows, meta }: { rows: LiveResponseRow[]; meta: ExerciseMeta | undefined }) {
  const labels = optionLabels(meta)
  const positions = new Map<string, number[]>()
  for (const r of rows) {
    const order = (r.response_json as { order?: string[] } | null)?.order ?? []
    order.forEach((id, i) => {
      const arr = positions.get(id) ?? []
      arr.push(i + 1)
      positions.set(id, arr)
    })
  }
  const averaged = [...positions.entries()]
    .map(([id, arr]) => ({ id, avg: arr.reduce((a, b) => a + b, 0) / arr.length, n: arr.length }))
    .sort((a, b) => a.avg - b.avg)

  if (averaged.length === 0) return <p className={styles.emptyNote}>No rankings yet.</p>
  return (
    <ol className={styles.rankList}>
      {averaged.map(({ id, avg }) => (
        <li key={id}>
          <span className={styles.rankAvg}>{avg.toFixed(1)}</span>
          <span className={styles.rankLabel}>{(labels.get(id) ?? id).split(':')[0]}</span>
        </li>
      ))}
    </ol>
  )
}

function RatingAggregate({ rows, meta }: { rows: LiveResponseRow[]; meta: ExerciseMeta | undefined }) {
  const labels = optionLabels(meta)
  const sums = new Map<string, { total: number; n: number }>()
  for (const r of rows) {
    const ratings = (r.response_json as RatingPickerResponse | null)?.ratings ?? {}
    for (const [id, value] of Object.entries(ratings)) {
      const cur = sums.get(id) ?? { total: 0, n: 0 }
      cur.total += value
      cur.n += 1
      sums.set(id, cur)
    }
  }
  const averaged = [...sums.entries()]
    .map(([id, { total, n }]) => ({ id, avg: total / n }))
    .sort((a, b) => b.avg - a.avg)

  if (averaged.length === 0) return <p className={styles.emptyNote}>No ratings yet.</p>
  const max = 5
  return (
    <div className={styles.section}>
      {averaged.map(({ id, avg }) => (
        <Bar key={id} label={labels.get(id) ?? id} count={Number(avg.toFixed(1))} max={max} names={[]} hidden />
      ))}
    </div>
  )
}

function TextCards({ rows, hideNames, structuredMeta }: {
  rows: LiveResponseRow[]
  hideNames: boolean
  structuredMeta?: ExerciseMeta
}) {
  const answered = rows.filter((r) => r.response_json != null)
  if (answered.length === 0) return <p className={styles.emptyNote}>No answers yet.</p>

  const questionPrompts = new Map<string, string>()
  if (structuredMeta) {
    const content = structuredMeta.content_json as unknown as StructuredTextContent
    for (const q of content.questions ?? []) {
      questionPrompts.set(q.id, q.prompt ?? q.label ?? q.id)
    }
  }

  return (
    <div className={styles.cards}>
      {answered.map((r, i) => {
        let body: React.ReactNode
        if (r.exercise_type === 'structured-text') {
          const answers = (r.response_json as unknown as StructuredTextResponse)?.answers ?? {}
          body = Object.entries(answers)
            .filter(([, v]) => v.trim() !== '')
            .map(([qid, v]) => (
              <p key={qid} className={styles.cardAnswer}>
                {questionPrompts.has(qid) ? <span className={styles.cardPrompt}>{questionPrompts.get(qid)} </span> : null}
                {v}
              </p>
            ))
        } else {
          body = <p className={styles.cardAnswer}>{(r.response_json as { value?: string } | null)?.value ?? ''}</p>
        }
        return (
          <div key={r.participant_id} className={styles.card}>
            <p className={styles.cardName}>{hideNames ? `Participant ${i + 1}` : firstName(r.display_name)}</p>
            {body}
          </div>
        )
      })}
    </div>
  )
}

function TableCards({ rows, hideNames }: { rows: LiveResponseRow[]; hideNames: boolean }) {
  const answered = rows.filter((r) => r.response_json != null)
  if (answered.length === 0) return <p className={styles.emptyNote}>No entries yet.</p>
  return (
    <div className={styles.cards}>
      {answered.map((r, i) => {
        const resp = r.response_json as unknown as TableResponse
        const filledRows = (resp?.rows ?? []).filter((row) => row.some((cell) => cell?.trim() !== '')).length
        return (
          <div key={r.participant_id} className={styles.card}>
            <p className={styles.cardName}>{hideNames ? `Participant ${i + 1}` : firstName(r.display_name)}</p>
            <p className={styles.cardAnswer}>
              {filledRows} row{filledRows !== 1 ? 's' : ''} filled
              {typeof resp?.total_spent === 'number'
                ? ` · $${resp.total_spent.toLocaleString()} allocated`
                : ''}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ── Panel ──────────────────────────────────────────────────

export function ResponsesPanel({ sessionId, slide, hideNames, onToggleHideNames, onClose }: ResponsesPanelProps) {
  const slugs = slide.linked_exercise_slugs
  const { rows, loading } = usePresentationResponses({ sessionId, exerciseSlugs: slugs })
  const [meta, setMeta] = useState<Record<string, ExerciseMeta>>({})
  const [activeSlug, setActiveSlug] = useState(slugs[0] ?? '')

  const slugsKey = slugs.join(',')
  useEffect(() => {
    let cancelled = false
    supabase
      .from('exercises')
      .select('slug, title, type, content_json')
      .in('slug', slugsKey.split(','))
      .then(({ data }) => {
        if (cancelled || !data) return
        setMeta(Object.fromEntries(data.map((e) => [e.slug, e as ExerciseMeta])))
      })
    return () => { cancelled = true }
  }, [slugsKey])

  const isDiscPair = slugs.includes(Q1_SLUG) && slugs.includes(Q2_SLUG)

  const participantIds = useMemo(() => new Set(rows.map((r) => r.participant_id)), [rows])
  const activeRows = useMemo(
    () => rows.filter((r) => r.exercise_slug === activeSlug),
    [rows, activeSlug]
  )
  const answeredCount = activeRows.filter((r) => r.response_json != null).length

  const activeMeta = meta[activeSlug]
  const activeType = activeMeta?.type ?? activeRows[0]?.exercise_type

  let body: React.ReactNode
  if (loading) {
    body = <div className={styles.loading}><Spinner size="md" /></div>
  } else if (isDiscPair) {
    body = <DiscDistribution rows={rows} hideNames={hideNames} />
  } else if (activeSlug === WATUSI_SOURCE_SLUG) {
    body = <WatusiDistribution rows={activeRows} />
  } else {
    switch (activeType) {
      case 'checkbox':
        body = <CheckboxAggregate rows={activeRows} meta={activeMeta} hideNames={hideNames} />
        break
      case 'ranking':
        body = <RankingAggregate rows={activeRows} meta={activeMeta} />
        break
      case 'rating-picker':
        body = <RatingAggregate rows={activeRows} meta={activeMeta} />
        break
      case 'table':
        body = <TableCards rows={activeRows} hideNames={hideNames} />
        break
      case 'structured-text':
        body = <TextCards rows={activeRows} hideNames={hideNames} structuredMeta={activeMeta} />
        break
      case 'text':
      default:
        body = <TextCards rows={activeRows} hideNames={hideNames} />
        break
    }
  }

  return (
    <aside className={styles.panel} aria-label="Live responses">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Live responses</h2>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close responses panel">
          ×
        </button>
      </div>

      {!isDiscPair && slugs.length > 1 ? (
        <div className={styles.tabs} role="tablist">
          {slugs.map((slug) => (
            <button
              key={slug}
              type="button"
              role="tab"
              aria-selected={slug === activeSlug}
              className={styles.tab}
              data-active={slug === activeSlug || undefined}
              onClick={() => setActiveSlug(slug)}
            >
              {meta[slug]?.title ?? slug}
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.statusRow}>
        <span className={styles.answered}>
          {isDiscPair
            ? `${participantIds.size} participant${participantIds.size !== 1 ? 's' : ''}`
            : `${answeredCount} of ${participantIds.size} answered`}
        </span>
        <label className={styles.hideNamesToggle}>
          <input type="checkbox" checked={hideNames} onChange={onToggleHideNames} />
          Hide names
        </label>
      </div>

      <div className={styles.body}>{body}</div>
    </aside>
  )
}
