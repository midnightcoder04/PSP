import { parseBlocks } from '@/lib/markdownBlocks'
import { pickStyleBlock } from '@/lib/coreStyle'
import type { CoreStyleSectionContent, Response } from '@/types/database'
import styles from './CoreStyleInfo.module.css'

interface CoreStyleInfoProps {
  content: CoreStyleSectionContent
  q1Response?: Response | null
  q2Response?: Response | null
  attribution?: string | null
}

/**
 * 006-iter6 / US3 (T037): dispatcher wrapper that picks the matched-style
 * content block from `content.sections_by_style` and renders it via the
 * shared `parseBlocks` helper. Falls back to `content.content` when the
 * quiz answers don't resolve a style.
 *
 * Contract: specs/006-iter6-personality-watusi-polish/contracts/personality-deep-dive.md
 */
export function CoreStyleInfo({
  content,
  q1Response,
  q2Response,
  attribution,
}: CoreStyleInfoProps) {
  const picked = pickStyleBlock(
    content.sections_by_style,
    q1Response?.response_json as { selected_ids?: string[] } | null,
    q2Response?.response_json as { selected_ids?: string[] } | null
  )
  const body = picked ?? content.content
  const isFallback = picked === null
  const blocks = parseBlocks(body)
  const attr = attribution ?? content.attribution

  return (
    <div className={styles.container}>
      <div className={`${styles.text} ${isFallback ? styles.fallback : ''}`}>
        {blocks.map((block, i) => {
          if (block.kind === 'br') return <br key={i} />
          if (block.kind === 'p') return <p key={i}>{block.text}</p>
          if (block.kind === 'ol') {
            return (
              <ol key={i} className={styles.numberedList}>
                {block.items.map((it, j) => <li key={j}>{it}</li>)}
              </ol>
            )
          }
          return (
            <ul key={i} className={styles.bulletList}>
              {block.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          )
        })}
      </div>
      {attr && <p className={styles.attribution}>{attr}</p>}
    </div>
  )
}
