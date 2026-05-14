import styles from './ValueBudgetWidget.module.css'

interface ValueBudgetWidgetProps {
  budget: number
  spent: number
}

function formatCurrency(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export function ValueBudgetWidget({ budget, spent }: ValueBudgetWidgetProps) {
  const remaining = budget - spent
  let state: 'in-progress' | 'perfect' | 'over-budget' = 'in-progress'
  if (remaining === 0) state = 'perfect'
  else if (remaining < 0) state = 'over-budget'

  return (
    <aside
      className={styles.widget}
      data-state={state}
      role="status"
      aria-live="polite"
      aria-label={`Budget tracker — spent ${formatCurrency(spent)} of ${formatCurrency(budget)}`}
    >
      <div className={styles.line}>
        <span className={styles.label}>Spent</span>
        <span className={styles.value}>{formatCurrency(spent)}</span>
      </div>
      <div className={styles.line}>
        <span className={styles.label}>Remaining</span>
        <span className={styles.value}>{formatCurrency(remaining)}</span>
      </div>
      {state === 'perfect' && <p className={styles.hint}>Perfect — exactly on budget.</p>}
      {state === 'over-budget' && <p className={styles.hint}>Over budget — reduce a row to continue.</p>}
    </aside>
  )
}
