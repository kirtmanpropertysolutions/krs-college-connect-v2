import { createClient } from '@supabase/supabase-js'

// Trim environment variables to avoid whitespace/newline issues
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

// Fail loudly and actionably if env vars are missing. A silent createClient()
// with undefined args produces a "broken" client that 404s every query — the
// resulting console errors are cryptic enough that someone running the app
// for the first time can waste an hour debugging. Listing exactly which vars
// are missing + where to set them saves that hour.
if (!supabaseUrl || !supabasePublishableKey) {
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabasePublishableKey && 'VITE_SUPABASE_PUBLISHABLE_KEY',
  ].filter(Boolean)
  const msg =
    `Missing Supabase environment variable${missing.length > 1 ? 's' : ''}: ` +
    `${missing.join(', ')}. Set ${missing.length > 1 ? 'them' : 'it'} in .env.local ` +
    `(see .env.example for the expected shape) and restart the dev server.`
  // Surface in the console even when the throw is caught somewhere upstream.
  console.error('[supabase.js]', msg)
  throw new Error(msg)
}

/**
 * Disable the Web Locks API auth lock.
 *
 * Supabase v2 uses navigator.locks under the hood to coordinate auth-token
 * refreshes across browser tabs. In practice — for a recruiting app where
 * 99% of athletes use one tab at a time — the lock causes more pain than
 * it prevents: when a tab crashes mid-refresh, an orphaned lock leaves
 * the NEXT page load stuck on "Loading..." because every Supabase query
 * waits for the lock to release.
 *
 * Supabase logs "Lock was not released within 5000ms. Forcefully
 * acquiring the lock to recover." and then often the recovery deadlocks
 * the profile query indefinitely. We've seen this manifest as a stuck
 * Loading spinner with no path to recovery short of clearing localStorage.
 *
 * Replacing the lock with a no-op makes Supabase fall back to optimistic
 * concurrency. Token refresh still works; the only risk is that two
 * tabs could refresh simultaneously and one's refreshed token clobbers
 * the other — but the auto-refresh logic handles that gracefully by
 * re-fetching on the next request.
 */
const noopLock = async (_name, _acquireTimeout, fn) => fn()

// Browser-safe client using publishable key only.
// NO service role key should ever be used in frontend code.
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    lock: noopLock,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Helper to get current user session
export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user || null
}

// Dev-only logger — verbose traces are valuable when debugging auth
// flow but pollute the prod console (and would leak query shapes to
// any athlete who opens devtools). `console.error` / `console.warn`
// stay unconditional below; only the breadcrumb-style logs are gated.
const devLog = (...args) => {
  if (import.meta.env.DEV) console.log(...args)
}

// Helper to check if user is admin
export const isAdmin = async () => {
  devLog('🔒 supabase.js: Checking if user is admin')
  try {
    const user = await getCurrentUser()
    if (!user) {
      devLog('❌ supabase.js: No user found for admin check')
      return false
    }

    devLog('🔍 supabase.js: Querying org_members for admin role, userId:', user.id)
    const { data, error } = await supabase
      .from('org_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('❌ supabase.js: Error checking admin role:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      })
      return false
    }

    devLog('✅ supabase.js: Admin check result:', { role: data?.role, isAdmin: data?.role === 'admin' })
    return data?.role === 'admin'
  } catch (error) {
    console.error('💥 supabase.js: Exception in isAdmin:', {
      message: error.message,
      stack: error.stack,
      fullError: error
    })
    return false
  }
}