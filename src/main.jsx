import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'
import App from './App.jsx'

// ErrorBoundary mounted ABOVE the router so an uncaught render error in
// any route (or in the providers) renders the calm "Something went
// wrong" card instead of a white screen. See src/components/ErrorBoundary.jsx.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

// Register the offline service worker — production builds only.
//   - In `vite dev` we'd fight Vite's HMR if a SW were intercepting
//     module requests (you'd get stale code on every reload).
//   - In production the SW caches the app shell + hashed assets and
//     intercepts navigations so the app boots even on a phone with
//     no signal. Logic lives in public/sw.js.
//
// Auto-update flow: when a new SW activates (because we deployed a
// new build), the browser fires `controllerchange`. We reload ONCE
// at that point so the user gets the new code instead of running
// yesterday's bundle against today's server. The `reloaded` guard
// prevents an infinite reload loop if something goes sideways.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')

      // If a new SW is found, force it to take over immediately
      // (the SW already calls skipWaiting + clients.claim on install,
      // but we also nudge it here in case it's stuck in the waiting
      // state from a previous tab that didn't unload cleanly).
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW is installed and an old one is still in control.
            // Tell the new one to skip waiting so controllerchange fires.
            installing.postMessage?.({ type: 'SKIP_WAITING' })
          }
        })
      })

      // The controllerchange event fires the moment the new SW takes
      // over. Reload once so the active page runs the fresh bundle.
      let reloaded = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return
        reloaded = true
        window.location.reload()
      })
    } catch (err) {
      console.warn('SW registration failed:', err)
    }
  })
}
