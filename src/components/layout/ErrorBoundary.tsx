import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import styles from './ErrorBoundary.module.css'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <h2 className={styles.heading}>Something went wrong</h2>
            <p className={styles.message}>
              An unexpected error occurred. Please refresh the page to try again.
            </p>
            <button
              className={styles.retry}
              onClick={() => this.setState({ error: null })}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
