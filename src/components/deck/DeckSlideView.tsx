import { parseBlocks } from '@/lib/markdownBlocks'
import type {
  PresentedSlide,
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
  DeckDiscussionContent,
  DeckExampleContent,
  DeckSuggestionContent,
  SessionCoverOverride,
} from '@/types/database'
import styles from './DeckSlideView.module.css'

interface DeckSlideViewProps {
  // Accepts real deck rows and the synthesized topic-insert / team-collab
  // slides (PresentedSlide widens DeckSlide's kind).
  slide: PresentedSlide
  /** Per-session cover customization; only applied when slide.kind === 'cover'. */
  coverOverride?: SessionCoverOverride | null
}

function Prose({ text }: { text: string }) {
  return (
    <>
      {parseBlocks(text).map((block, i) => {
        switch (block.kind) {
          case 'p':
            return <p key={i}>{block.text}</p>
          case 'br':
            return null
          case 'ol':
            return (
              <ol key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ol>
            )
          case 'ul':
            return (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            )
        }
      })}
    </>
  )
}

export function DeckSlideView({ slide, coverOverride }: DeckSlideViewProps) {
  const content = slide.content_json as unknown

  switch (slide.kind) {
    case 'cover': {
      const c = content as DeckCoverContent
      const o = coverOverride ?? {}
      return (
        <div className={styles.slide} data-kind="cover">
          {c.image ? <img className={styles.coverImage} src={c.image} alt="" /> : null}
          <div className={styles.coverText}>
            <h1 className={styles.coverTitle}>{c.title}</h1>
            {c.subtitle ? <p className={styles.coverSubtitle}>{c.subtitle}</p> : null}
            {o.title_line ? <p className={styles.coverSession}>{o.title_line}</p> : null}
            {o.subtitle ? <p className={styles.coverSessionSub}>{o.subtitle}</p> : null}
            {o.facilitator_name || o.date_line ? (
              <p className={styles.coverMeta}>
                {[o.facilitator_name, o.date_line].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            {c.org_line ? <p className={styles.coverOrg}>{c.org_line}</p> : null}
          </div>
        </div>
      )
    }

    case 'section-title': {
      const c = content as DeckSectionTitleContent
      return (
        <div className={styles.slide} data-kind="section-title">
          {c.kicker ? <p className={styles.kicker}>{c.kicker}</p> : null}
          <h1 className={styles.bigTitle}>{c.title}</h1>
          {c.subtitle ? <p className={styles.subtitle}>{c.subtitle}</p> : null}
        </div>
      )
    }

    case 'quote': {
      const c = content as DeckQuoteContent
      return (
        <div className={styles.slide} data-kind="quote">
          <blockquote className={styles.quote}>
            <p>“{c.quote}”</p>
            <cite>— {c.attribution}</cite>
          </blockquote>
        </div>
      )
    }

    case 'statement': {
      const c = content as DeckStatementContent
      return (
        <div className={styles.slide} data-kind="statement">
          <h1 className={styles.bigTitle}>{c.title}</h1>
          <div className={styles.statementBody}>
            <Prose text={c.body} />
          </div>
        </div>
      )
    }

    case 'bullets': {
      const c = content as DeckBulletsContent
      return (
        <div className={styles.slide} data-kind="bullets">
          <h1 className={styles.heading}>{c.title}</h1>
          {c.intro ? <p className={styles.intro}>{c.intro}</p> : null}
          <ul className={styles.bullets} data-dense={c.bullets.length > 8 || undefined}>
            {c.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )
    }

    case 'two-col': {
      const c = content as DeckTwoColContent
      return (
        <div className={styles.slide} data-kind="two-col">
          <h1 className={styles.heading}>{c.title}</h1>
          <div className={styles.columns} data-count={c.columns.length}>
            {c.columns.map((col, i) => (
              <div key={i} className={styles.column}>
                {col.image ? <img className={styles.columnImage} src={col.image} alt="" /> : null}
                <h2 className={styles.columnHeading}>{col.heading}</h2>
                {col.bullets.length > 0 ? (
                  <ul className={styles.columnBullets}>
                    {col.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )
    }

    case 'disc-profile': {
      const c = content as DeckDiscProfileContent
      return (
        <div className={styles.slide} data-kind="disc-profile" data-style={c.style}>
          <div className={styles.discHeader}>
            <span className={styles.discLetter}>{c.style}</span>
            <div>
              <h1 className={styles.heading}>{c.title}</h1>
              {c.subtitle ? <p className={styles.discSubtitle}>{c.subtitle}</p> : null}
            </div>
          </div>
          <div className={styles.discBody}>
            <ul className={styles.discAdjectives}>
              {c.adjectives.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            <ul className={styles.discStatements}>
              {c.statements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          {(c.youAre?.length || c.environment?.length) ? (
            <div className={styles.discEnvironment}>
              {c.youAre?.length ? (
                <div className={styles.discEnvCol}>
                  <h2 className={styles.discEnvHeading}>{`If you are a ${c.title}, you are…`}</h2>
                  <ul className={styles.discEnvBullets}>
                    {c.youAre.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {c.environment?.length ? (
                <div className={styles.discEnvCol}>
                  <h2 className={styles.discEnvHeading}>{`Ideal Environment for the ${c.title}`}</h2>
                  <ul className={styles.discEnvBullets}>
                    {c.environment.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )
    }

    case 'numbered-list': {
      const c = content as DeckNumberedContent
      const start = c.start ?? 1
      return (
        <div className={styles.slide} data-kind="numbered-list">
          <h1 className={styles.heading}>{c.title}</h1>
          <ol className={styles.numbered} start={start} data-dense={c.items.length > 6 || undefined}>
            {c.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </div>
      )
    }

    case 'image': {
      const c = content as DeckImageContent
      return (
        <div className={styles.slide} data-kind="image">
          {c.title ? <h1 className={styles.heading}>{c.title}</h1> : null}
          <img className={styles.mainImage} src={c.src} alt={c.title ?? ''} />
          {c.caption ? <p className={styles.caption}>{c.caption}</p> : null}
        </div>
      )
    }

    case 'contact': {
      const c = content as DeckContactContent
      return (
        <div className={styles.slide} data-kind="contact">
          {c.image ? <img className={styles.contactImage} src={c.image} alt="" /> : null}
          <h1 className={styles.bigTitle}>{c.title}</h1>
          <div className={styles.contactLines}>
            {c.lines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )
    }

    // ── Topic-aware inserts (007) ──────────────────────────────────────────
    case 'discussion': {
      const c = content as DeckDiscussionContent
      return (
        <div className={styles.slide} data-kind="discussion">
          <p className={styles.kicker}>Discuss as a group</p>
          <h1 className={styles.heading}>{c.title}</h1>
          <ol className={styles.numbered} data-dense={(c.questions?.length ?? 0) > 6 || undefined}>
            {(c.questions ?? []).map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </div>
      )
    }

    case 'example': {
      const c = content as DeckExampleContent
      return (
        <div className={styles.slide} data-kind="example">
          <p className={styles.kicker}>Example</p>
          <h1 className={styles.heading}>{c.title}</h1>
          <div className={styles.statementBody}>
            <Prose text={c.body ?? ''} />
          </div>
        </div>
      )
    }

    case 'suggestion': {
      const c = content as DeckSuggestionContent
      return (
        <div className={styles.slide} data-kind="suggestion">
          <p className={styles.kicker}>Tip</p>
          <h1 className={styles.heading}>{c.title}</h1>
          <div className={styles.statementBody}>
            <Prose text={c.body ?? ''} />
          </div>
        </div>
      )
    }

    // Placeholder for menu thumbnails / editor previews where there is no
    // session context. The live view is rendered by TeamCollaborationSlide.
    case 'team-collaboration':
      return (
        <div className={styles.slide} data-kind="team-collaboration">
          <p className={styles.kicker}>Team collaboration</p>
          <h1 className={styles.heading}>Your team at a glance</h1>
          <p className={styles.caption}>
            Live participant profiles appear here during the session.
          </p>
        </div>
      )

    default:
      return (
        <div className={styles.slide} data-kind="unknown">
          <p className={styles.caption}>Unsupported slide kind: {slide.kind}</p>
        </div>
      )
  }
}
