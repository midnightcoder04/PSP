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

  return (
    <div className={styles.container}>
      <div className={styles.text}>
        {content.content.split('\n').map((line, i) => (
          line ? <p key={i}>{line}</p> : <br key={i} />
        ))}
      </div>
      {attr && (
        <p className={styles.attribution}>{attr}</p>
      )}
    </div>
  )
}
