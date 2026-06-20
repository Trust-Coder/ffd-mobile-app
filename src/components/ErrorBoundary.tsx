import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { track } from '@/lib/analytics'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

/** Top-level boundary so a render error shows a recover screen, not a blank WebView. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    track('app_crash', { message: error.message, stack: info.componentStack?.slice(0, 500) })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="crash-screen">
          <h1>Something went wrong</h1>
          <p>The app hit an unexpected error.</p>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
