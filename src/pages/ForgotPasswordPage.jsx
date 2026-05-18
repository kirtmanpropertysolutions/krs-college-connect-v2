import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import EastsideFCLogo from '../components/EastsideFC_Logo'

/**
 * Forgot Password — Step 1.
 *
 * User enters their email. We call Supabase's built-in
 * resetPasswordForEmail which sends a magic link that lands on
 * `/reset-password`. The link puts the user in a temporary signed-in
 * recovery state where ResetPasswordPage lets them set a new password.
 *
 * For privacy we always show the same success message regardless of
 * whether the email exists in our system — otherwise this page would
 * be a free user-enumeration endpoint.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return
    setSubmitting(true)
    setError('')
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )
      // Note: we intentionally don't surface "user not found" — see
      // privacy comment above. Only show errors on transport failures.
      if (resetErr && !/user not found/i.test(resetErr.message)) {
        console.error('resetPasswordForEmail error:', resetErr)
        setError('Something went wrong. Try again in a moment.')
        return
      }
      setSent(true)
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="hero-card p-9 max-w-md w-full">
        {/* Crest + brand */}
        <div className="flex flex-col items-center mb-7 pb-6 border-b border-card-border">
          <EastsideFCLogo size={64} className="mb-3" />
          <div className="display-font text-lg tracking-[0.08em] text-white">
            Eastside FC
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-text-secondary mt-1">
            Password Reset
          </div>
        </div>

        {sent ? (
          // Confirmation state — always shown after submit regardless
          // of whether the email exists (privacy).
          <div className="text-center">
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-red-900/40"
              style={{
                background:
                  'linear-gradient(135deg, rgba(200,16,46,0.18) 0%, rgba(10,14,26,0.5) 100%)',
              }}
            >
              <Mail size={22} className="text-red-500" />
            </div>
            <h2 className="display-font text-xl text-white mb-2">
              Check your email
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed mb-6">
              If an account exists for <span className="text-white">{email}</span>,
              we sent a reset link. It expires in 1 hour.
            </p>
            <Link
              to="/login"
              className="secondary-btn inline-flex items-center gap-2"
            >
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-px w-6" style={{ background: 'var(--crimson)' }} />
              <div className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>
                Forgot password
              </div>
            </div>
            <h2 className="display-font text-[26px] text-white mb-2 leading-tight">
              Reset your password
            </h2>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Enter the email you used to sign up. We'll send you a link to
              choose a new password.
            </p>

            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-5 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input w-full"
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  disabled={submitting}
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !email}
                className="eastside-btn w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: '12px 18px', fontSize: '14px' }}
              >
                {submitting ? 'Sending…' : (
                  <>
                    Send reset link <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-card-border text-center">
              <Link
                to="/login"
                className="text-text-secondary text-sm hover:text-white inline-flex items-center gap-1"
              >
                <ArrowLeft size={13} /> Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
