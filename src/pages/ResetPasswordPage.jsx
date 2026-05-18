import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import EastsideFCLogo from '../components/EastsideFC_Logo'

/**
 * Reset Password — Step 2.
 *
 * This page is the landing target for the email link that
 * ForgotPasswordPage triggered. Supabase exchanges the URL hash token
 * for a temporary session in PASSWORD_RECOVERY state and fires an
 * auth state-change event. The only legal action in that state is
 * updating the user's password, which we do via auth.updateUser.
 *
 * After success we sign the user out (so they go through a fresh
 * sign-in with the new password) and redirect to /login.
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  // Track whether Supabase has accepted the recovery token from the URL
  // hash. Until it has, submitting would fail with "Auth session missing".
  const [recoveryReady, setRecoveryReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase auto-processes the hash fragment on page load and fires
    // PASSWORD_RECOVERY when ready. If the user is already in a
    // recovery session (e.g. they reloaded the page), accept that too.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setRecoveryReady(true)
      }
    })
    // Also check current session in case the event already fired
    // before this effect attached.
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setRecoveryReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords don\'t match.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) {
        setError(updateErr.message || 'Could not update password. Try again.')
        return
      }
      setDone(true)
      // Sign out after a short delay so the user sees the success
      // state, then route them to /login for a clean sign-in.
      setTimeout(async () => {
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
      }, 1800)
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Try the email link again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="hero-card p-9 max-w-md w-full">
        <div className="flex flex-col items-center mb-7 pb-6 border-b border-card-border">
          <EastsideFCLogo size={64} className="mb-3" />
          <div className="display-font text-lg tracking-[0.08em] text-white">
            Eastside FC
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-text-secondary mt-1">
            New Password
          </div>
        </div>

        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-green-700/40"
                 style={{ background: 'rgba(16,185,129,0.12)' }}>
              <CheckCircle2 size={26} className="text-green-500" />
            </div>
            <h2 className="display-font text-xl text-white mb-2">
              Password updated
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              Redirecting you to sign in…
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-px w-6" style={{ background: 'var(--crimson)' }} />
              <div className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>
                Set a new password
              </div>
            </div>
            <h2 className="display-font text-[26px] text-white mb-2 leading-tight">
              Choose your new password
            </h2>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Pick something at least 8 characters. You'll use this to sign in
              from now on.
            </p>

            {!recoveryReady && (
              <div className="bg-amber-900/30 border border-amber-700/40 text-amber-300 px-4 py-3 rounded-lg mb-5 text-sm">
                Verifying your reset link… If this doesn't load, open the email
                link again or <Link to="/forgot-password" className="underline">request a new one</Link>.
              </div>
            )}

            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-5 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="form-label">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input w-full"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={submitting || !recoveryReady}
                />
              </div>
              <div>
                <label htmlFor="confirm" className="form-label">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="form-input w-full"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={submitting || !recoveryReady}
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !recoveryReady || !password || !confirm}
                className="eastside-btn w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: '12px 18px', fontSize: '14px' }}
              >
                {submitting ? 'Updating…' : (
                  <>
                    Update password <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
