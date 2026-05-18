/**
 * InstallCTA — a small banner that prompts the athlete to install
 * the platform as a real app on their phone or computer.
 *
 * Three intelligent states:
 *
 *   1. Already installed (running as PWA in standalone display mode) →
 *      render nothing. We don't want to nag installed users.
 *
 *   2. Browser supports the `beforeinstallprompt` event (Chrome,
 *      Edge, Android Chrome, desktop Chrome) → show a one-tap
 *      "Install KRS" button that triggers the native install prompt.
 *      This is the cleanest UX — the user never has to find a hidden
 *      browser menu.
 *
 *   3. iOS Safari (which doesn't fire beforeinstallprompt) → show a
 *      short instructional banner: "Tap Share → Add to Home Screen"
 *      with the actual Share icon visualized inline so the user
 *      knows what to look for.
 *
 * Dismissible via the X — dismissal saved in localStorage so we
 * don't nag the user every page load. Only re-appears if they clear
 * site data or open in a new browser.
 */

import { useEffect, useState } from 'react'
import { Smartphone, X, Share, Plus } from 'lucide-react'

const STORAGE_KEY = 'krs_install_dismissed'

export default function InstallCTA() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY))
    } catch {
      return false
    }
  })

  // Detect whether the app is already running as a PWA.
  // - matchMedia('(display-mode: standalone)') covers Chrome/Android/desktop installed PWAs
  // - window.navigator.standalone covers iOS Safari installed PWAs
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator?.standalone === true
    )
  })

  // The deferred install prompt. Captured from beforeinstallprompt.
  // null on iOS / unsupported browsers — we render the iOS variant
  // instead in that case.
  const [installPrompt, setInstallPrompt] = useState(null)

  // Are we on iOS Safari? (Detection via UA — Apple still doesn't
  // expose a better feature query for this.) iOS-on-Chrome is just
  // Safari under the hood and ALSO can't install web apps from
  // Chrome — only Safari can. So we treat both the same.
  const isIOS = (() => {
    if (typeof window === 'undefined') return false
    const ua = window.navigator.userAgent
    return /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS/i.test(ua)
  })()
  // ^ The CriOS/FxiOS exclusion is intentional — Chrome and Firefox
  //   on iOS can't install PWAs at all. We'd rather show nothing than
  //   give instructions that won't work in their browser.

  useEffect(() => {
    // Listen for the install-ready event. Browsers fire this when the
    // PWA criteria are met (manifest, HTTPS, service worker, etc).
    const handler = (e) => {
      e.preventDefault() // stops the browser's own mini-infobar
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Also flip our standalone flag if the user installs via the
    // browser UI mid-session — fires on successful install.
    const installedHandler = () => setIsStandalone(true)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  // Don't render in any of these cases
  if (isStandalone) return null
  if (dismissed) return null
  // On iOS only show if it's actually Safari (the only browser that can install)
  if (isIOS) {
    // fall through to iOS banner
  } else if (!installPrompt) {
    // Non-iOS browser that hasn't fired beforeinstallprompt yet.
    // Either too early in the page session, or the browser can't
    // install this site. Hide silently — better than a broken CTA.
    return null
  }

  const handleInstallClick = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice?.outcome === 'accepted') {
      setIsStandalone(true)
    }
    setInstallPrompt(null)
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* private mode — soft fail */
    }
    setDismissed(true)
  }

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 design-card max-w-md w-[calc(100vw-32px)] px-4 py-3 flex items-center gap-3 animate-slide-up-soft shadow-2xl"
      style={{
        // sit ABOVE the mobile tab bar (76px tall + safe-area)
        bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(135deg, #131a2c 0%, #0f1729 100%)',
        borderColor: 'rgba(200,16,46,0.45)',
      }}
      role="dialog"
      aria-label="Install KRS College Connect"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-900/40"
        style={{
          background: 'linear-gradient(135deg, rgba(200,16,46,0.22) 0%, rgba(10,14,26,0.5) 100%)',
        }}
      >
        <Smartphone size={20} className="text-red-500" />
      </div>

      <div className="flex-1 min-w-0">
        {isIOS ? (
          <>
            <div className="text-white font-semibold text-[13px] leading-tight">
              Install KRS on your home screen
            </div>
            <div className="text-text-secondary text-[11px] leading-snug mt-0.5 flex items-center gap-1 flex-wrap">
              Tap <Share size={11} className="inline" aria-label="Share" />{' '}
              Share, then{' '}
              <Plus size={11} className="inline" aria-label="Add" /> Add to Home Screen
            </div>
          </>
        ) : (
          <>
            <div className="text-white font-semibold text-[13px] leading-tight">
              Install KRS as an app
            </div>
            <div className="text-text-secondary text-[11px] leading-snug mt-0.5">
              Faster, full-screen, on your home screen.
            </div>
          </>
        )}
      </div>

      {!isIOS && installPrompt && (
        <button
          onClick={handleInstallClick}
          className="eastside-btn flex-shrink-0"
          style={{ padding: '7px 12px', fontSize: '12px' }}
        >
          Install
        </button>
      )}

      <button
        onClick={handleDismiss}
        className="text-text-tertiary hover:text-white flex-shrink-0 tap-target"
        aria-label="Dismiss install prompt"
      >
        <X size={16} />
      </button>
    </div>
  )
}
