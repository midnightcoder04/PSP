import { parseBlocks } from '@/lib/markdownBlocks'
import styles from './InfoExercise.module.css'

interface InfoContent {
  content: string
  attribution?: string | null
}

interface InfoExerciseProps {
  content: InfoContent
  attribution?: string | null
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
