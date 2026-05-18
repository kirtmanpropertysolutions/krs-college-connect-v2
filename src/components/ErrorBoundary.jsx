import { Component } from 'react'
import EastsideFCLogo from './EastsideFC_Logo'

/**
 * Top-level error boundary.
 *
 * React doesn't include error boundaries out of the box — any uncaught
 * render error blanks the entire tree to white. For a recruiting app
 * used by minor athletes (and their parents) on phones in random
 * stadium WiFi conditions, "white screen with no recovery path" is the
 * worst failure mode we can ship. This component catches render errors
 * anywhere below it, logs them with a stable prefix so they're easy to
 * grep in production logs, and shows a calm "Something went wrong"
 * card with a Reload button.
 *
 * Intentionally mounted ONCE at the root (above the router), not per
 * route — wrapping individual routes would let the user click around
 * an obviously-broken app pretending things are fine.
 *
 * Class component because `getDerivedStateFromError` + `componentDidCatch`
 * have no hook equivalents in React 19. This is the canonical pattern.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI.
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Stable prefix so production log search picks these up.
    // (We don't ship a remote error reporter yet — when we do, this
    // is the hook point.)
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo)
  }

  handleReload = () => {
    // Hard reload — clears any in-memory bad state. Service worker
    // (if registered) still serves the cached app shell so the user
    // gets back into the app even if the network is flaky.
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <EastsideFCLogo size={56} className="mx-auto mb-4 opacity-80" />
          <div className="display-font text-3xl text-fg-primary mb-2">
            Something went wrong
          </div>
          <p className="text-text-secondary text-sm mb-6">
            The app hit an unexpected error. Reloading usually fixes it.
            If it keeps happening, email your club admin so we can take
            a look.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="eastside-btn"
              style={{ padding: '10px 18px', fontSize: '14px' }}
            >
              Reload app
            </button>
            <a
              href="mailto:support@eastsidefc.com"
              className="secondary-btn inline-flex items-center gap-2"
              style={{ padding: '10px 18px', fontSize: '14px' }}
            >
              Email support
            </a>
          </div>
        </div>
      </div>
    )
  }
}
