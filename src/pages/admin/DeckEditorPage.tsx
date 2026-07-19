import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Toast } from '@/components/ui/Toast'
import { DeckSlideView } from '@/components/deck/DeckSlideView'
import type {
  DeckSlide,
  DeckCoverContent,
  DeckSectionTitleContent,
  DeckQuoteContent,
  DeckStatementContent,
  DeckBulletsContent,
  DeckTwoColContent,
  DeckDiscProfileContent,
  DeckNumberedContent,
  DeckImageContent,
  DeckContactContent,
  Json,
} from '@/types/database'
import styles from './DeckEditorPage.module.css'

// Text-level editor only: slug, kind, chapter, order_index, linked_exercise_slugs
// and image src are structural (change via reseed), so they render read-only.

const CHAPTER_LABELS: Record<string, string> = {
  opening: 'Opening',
  personality: 'Personality',
  attitudes: 'Attitudes',
  values: 'Values',
  roles: 'Roles & Demands',
  skills: 'Transferable Skills',
  goals: 'Goal Setting',
  closing: 'Closing',
}

// Native slide size the presenter stage renders at; the preview scales down from it.
const STAGE_W = 1280

type Draft = Record<string, unknown>

function slideTitle(slide: DeckSlide): string {
  const c = slide.content_json as Draft
  if (typeof c.title === 'string' && c.title.trim()) return c.title
  if (typeof c.quote === 'string') return `“${(c.quote as string).slice(0, 40)}…”`
  return slide.slug
}

/** Drop whitespace-only lines the one-per-line textareas leave behind. */
function normalizeContent(value: unknown): unknown {
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v === 'string')) {
      return (value as string[]).filter((s) => s.trim() !== '')
    }
    return value.map(normalizeContent)
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalizeContent(v)])
    )
  }
  return value
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea id={id} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

function LinesField({
  label,
  value,
  onChange,
  rows = 6,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  rows?: number
}) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label} <span className={styles.hint}>one per line</span>
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value.join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n'))}
      />
    </div>
  )
}

function SlideForm({
  slide,
  draft,
  onChange,
}: {
  slide: DeckSlide
  draft: Draft
  onChange: (d: Draft) => void
}) {
  const set = (key: string) => (v: string | string[]) => onChange({ ...draft, [key]: v })

  switch (slide.kind) {
    case 'cover': {
      const c = draft as unknown as DeckCoverContent
      return (
        <>
          <TextField label="Title" value={c.title ?? ''} onChange={set('title')} />
          <TextField label="Subtitle" value={c.subtitle ?? ''} onChange={set('subtitle')} />
          <TextField label="Date line" value={c.date_line ?? ''} onChange={set('date_line')} />
          <TextField label="Facilitator name" value={c.facilitator_name ?? ''} onChange={set('facilitator_name')} />
          <TextField label="Organization line" value={c.org_line ?? ''} onChange={set('org_line')} />
        </>
      )
    }
    case 'section-title': {
      const c = draft as unknown as DeckSectionTitleContent
      return (
        <>
          <TextField label="Kicker" value={c.kicker ?? ''} onChange={set('kicker')} />
          <TextField label="Title" value={c.title ?? ''} onChange={set('title')} />
          <TextField label="Subtitle" value={c.subtitle ?? ''} onChange={set('subtitle')} />
        </>
      )
    }
    case 'quote': {
      const c = draft as unknown as DeckQuoteContent
      return (
        <>
          <TextField label="Quote" value={c.quote ?? ''} onChange={set('quote')} multiline />
          <TextField label="Attribution" value={c.attribution ?? ''} onChange={set('attribution')} />
        </>
      )
    }
    case 'statement': {
      const c = draft as unknown as DeckStatementContent
      return (
        <>
          <TextField label="Title" value={c.title ?? ''} onChange={set('title')} />
          <TextField label="Body" value={c.body ?? ''} onChange={set('body')} multiline />
        </>
      )
    }
    case 'bullets': {
      const c = draft as unknown as DeckBulletsContent
      return (
        <>
          <TextField label="Title" value={c.title ?? ''} onChange={set('title')} />
          <TextField label="Intro" value={c.intro ?? ''} onChange={set('intro')} />
          <LinesField label="Bullets" value={c.bullets ?? []} onChange={set('bullets')} />
        </>
      )
    }
    case 'two-col': {
      const c = draft as unknown as DeckTwoColContent
      const setColumn = (i: number, patch: Partial<{ heading: string; bullets: string[] }>) =>
        onChange({
          ...draft,
          columns: c.columns.map((col, j) => (j === i ? { ...col, ...patch } : col)),
        })
      return (
        <>
          <TextField label="Title" value={c.title ?? ''} onChange={set('title')} />
          {c.columns.map((col, i) => (
            <fieldset key={i} className={styles.columnGroup}>
              <legend>Column {i + 1}</legend>
              <TextField label="Heading" value={col.heading ?? ''} onChange={(v) => setColumn(i, { heading: v })} />
              <LinesField label="Bullets" value={col.bullets ?? []} onChange={(v) => setColumn(i, { bullets: v })} rows={4} />
            </fieldset>
          ))}
        </>
      )
    }
    case 'disc-profile': {
      const c = draft as unknown as DeckDiscProfileContent
      return (
        <>
          <TextField label="Title" value={c.title ?? ''} onChange={set('title')} />
          <TextField label="Subtitle" value={c.subtitle ?? ''} onChange={set('subtitle')} />
          <LinesField label="Adjectives" value={c.adjectives ?? []} onChange={set('adjectives')} />
          <LinesField label="Statements" value={c.statements ?? []} onChange={set('statements')} rows={8} />
        </>
      )
    }
    case 'numbered-list': {
      const c = draft as unknown as DeckNumberedContent
      return (
        <>
          <TextField label="Title" value={c.title ?? ''} onChange={set('title')} />
          <LinesField label="Items" value={c.items ?? []} onChange={set('items')} rows={10} />
        </>
      )
    }
    case 'image': {
      const c = draft as unknown as DeckImageContent
      return (
        <>
          <TextField label="Title" value={c.title ?? ''} onChange={set('title')} />
          <TextField label="Caption" value={c.caption ?? ''} onChange={set('caption')} />
        </>
      )
    }
    case 'contact': {
      const c = draft as unknown as DeckContactContent
      return (
        <>
          <TextField label="Title" value={c.title ?? ''} onChange={set('title')} />
          <LinesField label="Lines" value={c.lines ?? []} onChange={set('lines')} />
        </>
      )
    }
    default:
      return null
  }
}

export default function DeckEditorPage() {
  const [slides, setSlides] = useState<DeckSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({})
  const [draftNotes, setDraftNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)
  const notesId = useId()

  const stageWrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('deck_slides')
        .select('*')
        .order('order_index', { ascending: true })
      if (cancelled) return
      if (error) {
        setToast({ message: `Failed to load deck: ${error.message}`, variant: 'error' })
      } else if (data && data.length > 0) {
        setSlides(data)
        setSelectedId(data[0].id)
        setDraft(structuredClone(data[0].content_json) as Draft)
        setDraftNotes(data[0].notes ?? '')
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const el = stageWrapRef.current
    if (!el) return
    const update = () => {
      if (el.clientWidth > 0) setScale(el.clientWidth / STAGE_W)
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [selectedId, loading])

  const selected = slides.find((s) => s.id === selectedId) ?? null
  const dirty =
    selected !== null &&
    (JSON.stringify(draft) !== JSON.stringify(selected.content_json) ||
      draftNotes !== (selected.notes ?? ''))

  function selectSlide(slide: DeckSlide) {
    if (slide.id === selectedId) return
    if (dirty && !window.confirm('Discard unsaved changes to the current slide?')) return
    setSelectedId(slide.id)
    setDraft(structuredClone(slide.content_json) as Draft)
    setDraftNotes(slide.notes ?? '')
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    const content = normalizeContent(draft) as Json
    const notes = draftNotes.trim() === '' ? null : draftNotes
    const { error } = await supabase
      .from('deck_slides')
      .update({ content_json: content, notes, updated_at: new Date().toISOString() })
      .eq('id', selected.id)
    setSaving(false)
    if (error) {
      setToast({ message: `Save failed: ${error.message}`, variant: 'error' })
      return
    }
    setSlides((prev) =>
      prev.map((s) => (s.id === selected.id ? { ...s, content_json: content, notes } : s))
    )
    setDraft(structuredClone(content) as Draft)
    setToast({ message: 'Slide saved', variant: 'success' })
  }

  if (loading) {
    return (
      <PageShell title="Presentation Deck">
        <div className={styles.loading}><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  if (slides.length === 0) {
    return (
      <PageShell title="Presentation Deck">
        <div className={styles.empty}>
          <p>No deck slides found. Run <code>npm run db:seed:deck</code> to load the deck.</p>
        </div>
      </PageShell>
    )
  }

  const chapters = [...new Set(slides.map((s) => s.chapter))]

  return (
    <PageShell title="Presentation Deck">
      <p className={styles.lede}>
        Edit slide text for the facilitator presentation. Structure (slide order, kinds,
        images, exercise links) is managed by the deck seed.
      </p>
      <div className={styles.layout}>
        {/* ── Slide list ── */}
        <nav className={styles.slideList} aria-label="Deck slides">
          {chapters.map((chapter) => (
            <div key={chapter} className={styles.chapterGroup}>
              <h2 className={styles.chapterHeading}>{CHAPTER_LABELS[chapter] ?? chapter}</h2>
              <ul role="list">
                {slides.filter((s) => s.chapter === chapter).map((slide) => (
                  <li key={slide.id}>
                    <button
                      type="button"
                      className={styles.slideItem}
                      data-selected={slide.id === selectedId || undefined}
                      onClick={() => selectSlide(slide)}
                    >
                      <span className={styles.slideItemTitle}>{slideTitle(slide)}</span>
                      <span className={styles.slideItemMeta}>
                        <Badge variant="muted">{slide.kind}</Badge>
                        {slide.linked_exercise_slugs.length > 0 ? (
                          <Badge variant="info">linked</Badge>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── Editor + preview ── */}
        {selected ? (
          <div className={styles.editor}>
            <div className={styles.editorHeader}>
              <div className={styles.editorMeta}>
                <code className={styles.slug}>{selected.slug}</code>
                <Badge variant="muted">{selected.kind}</Badge>
                {selected.linked_exercise_slugs.map((slug) => (
                  <Badge key={slug} variant="info">{slug}</Badge>
                ))}
              </div>
              <Button onClick={save} loading={saving} disabled={!dirty}>
                {dirty ? 'Save changes' : 'Saved'}
              </Button>
            </div>

            <div ref={stageWrapRef} className={styles.previewWrap}>
              <div
                className={styles.previewStage}
                style={{ transform: `scale(${scale})` }}
                aria-hidden="true"
              >
                <DeckSlideView slide={{ ...selected, content_json: draft as Json }} />
              </div>
            </div>

            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); save() }}>
              <SlideForm slide={selected} draft={draft} onChange={setDraft} />
              <div className={styles.field}>
                <label htmlFor={notesId}>Speaker notes</label>
                <textarea
                  id={notesId}
                  rows={3}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                />
              </div>
            </form>
          </div>
        ) : null}
      </div>

      {toast ? (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      ) : null}
    </PageShell>
  )
}
