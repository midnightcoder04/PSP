import styles from './InfoExercise.module.css'

interface InfoContent {
  content: string
  attribution?: string | null
}

interface InfoExerciseProps {
  content: InfoContent
  attribution?: string | null
}

/**
 * 005-iter5-ux-fixes / US6 (FR-062):
 * Group consecutive numbered (`1.`, `2.`) lines into a single <ol> and
 * consecutive bullet (`•`, `-`, `*`) lines into a single <ul>. Other lines
 * render as <p>. Each list item / paragraph occupies its own row.
 */
type Block =
  | { kind: 'p'; text: string }
  | { kind: 'br' }
  | { kind: 'ol'; items: string[] }
  | { kind: 'ul'; items: string[] }

const NUMBERED = /^\s*\d+\.\s+(.*)$/
const BULLET = /^\s*[•\-*]\s+(.*)$/

function parseBlocks(content: string): Block[] {
  const lines = content.split('\n')
  const blocks: Block[] = []
  for (const raw of lines) {
    const line = raw
    if (line === '') {
      blocks.push({ kind: 'br' })
      continue
    }
    const numMatch = line.match(NUMBERED)
    const bulMatch = !numMatch ? line.match(BULLET) : null

    const last = blocks[blocks.length - 1]
    if (numMatch) {
      if (last && last.kind === 'ol') last.items.push(numMatch[1])
      else blocks.push({ kind: 'ol', items: [numMatch[1]] })
    } else if (bulMatch) {
      if (last && last.kind === 'ul') last.items.push(bulMatch[1])
      else blocks.push({ kind: 'ul', items: [bulMatch[1]] })
    } else {
      blocks.push({ kind: 'p', text: line })
    }
  }
  return blocks
}

export function InfoExercise({ content, attribution }: InfoExerciseProps) {
  const attr = attribution ?? content.attribution
  const blocks = parseBlocks(content.content)

  return (
    <div className={styles.container}>
      <div className={styles.text}>
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
      {attr && (
        <p className={styles.attribution}>{attr}</p>
      )}
    </div>
  )
}
