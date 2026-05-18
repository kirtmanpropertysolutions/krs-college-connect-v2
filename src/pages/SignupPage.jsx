import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../hooks/authContext'
import EastsideFCLogo from '../components/EastsideFC_Logo'

export default function SignupPage() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // Pre-fill invite code from ?code=… in the URL (admin "Send via Gmail" flow
  // sends athletes a link like /signup?code=EASTSIDE2026). Derived at mount
  // via the lazy useState initializer so we don't need an effect for it.
  const [inviteCode, setInviteCode] = useState(() => {
    const codeFromUrl = searchParams.get('code')
    return codeFromUrl ? codeFromUrl.trim().toUpperCase() : ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setIsLoading(false)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setIsLoading(false)
      return
    }
    if (!inviteCode.trim()) {
      setError('Invite code is required. Ask your club admin if you don\'t have one.')
      setIsLoading(false)
      return
    }

    try {
      const { error: signUpError } = await signUp(email, password, inviteCode.trim())
      if (signUpError) {
        setError(signUpError.message)
      }
      // Success — auth state change will redirect into the app
    } catch (err) {
      console.error('Signup exception:', err)
      setError('Signup failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const codeFromUrl = searchParams.get('code')

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6 relative">
      <div className="max-w-5xl w-full grid md:grid-cols-[1.1fr_1fr] gap-16 items-center">
        {/* LEFT — Pitch */}
        <div className="hidden md:block">
          <div className="flex items-center gap-3 mb-7">
            <div className="h-px w-10" style={{ background: 'var(--crimson)' }} />
            <div
              className="text-[10px] tracking-[0.25em] uppercase font-bold"
              style={{ color: 'var(--crimson)' }}
            >
              KRS · ECNL Recruiting
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <EastsideFCLogo size={64} />
            <div>
              <div className="display-font text-xl tracking-[0.08em] text-white leading-tight">
                Eastside FC Washington
              </div>
              <div className="text-xs text-text-secondary tracking-wider uppercase mt-0.5">
                Est. 1970 · Bellevue, WA
              </div>
            </div>
          </div>

          <h1 className="display-font text-[56px] leading-[1.02] mb-6 text-white">
            Welcome to your<br />
            <span style={{ color: 'var(--crimson)' }}>club's recruiting</span><br />
            engine.
          </h1>

          <p className="text-[17px] text-text-secondary max-w-md mb-8 leading-relaxed">
            Sign up with your club invite code and you'll have access to your school pipeline,
            coach contacts, the School Fit Quiz, video highlights, NIL deals, and direct
            outreach — all in one place.
          </p>

          <div className="space-y-2.5">
            {[
              'College pipeline + drag-to-stage progress',
              'Verified coach contacts for 270+ programs',
              'Send coach emails from your own Gmail',
              'Personalized School Fit Quiz',
              'NIL marketplace for club partnerships',
            ].map((line) => (
              <div key={line} className="flex items-center gap-2 text-sm text-text-secondary">
                <CheckCircle2 size={14} style={{ color: 'var(--crimson-3)' }} />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Signup card */}
        <div className="hero-card p-9 max-w-md w-full mx-auto md:mx-0">
          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-3 mb-7 pb-5 border-b border-card-border">
            <EastsideFCLogo size={52} />
            <div>
              <div className="display-font text-base tracking-[0.08em] text-white">Eastside FC</div>
              <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                Join the club
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-1">
            <div className="h-px w-6" style={{ background: 'var(--crimson)' }} />
            <div
              className="text-[10px] uppercase tracking-[0.22em] font-bold"
              style={{ color: 'var(--crimson)' }}
            >
              {codeFromUrl ? 'Invite received' : 'New athlete'}
            </div>
          </div>
          <h2 className="display-font text-[26px] text-white mb-1 leading-tight">
            Create your account
          </h2>
          <p className="text-text-secondary text-sm mb-6">
            {codeFromUrl
              ? `Your invite code "${codeFromUrl.toUpperCase()}" is ready — just add your email and a password.`
              : 'Use your club\'s invite code to join.'}
          </p>

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input w-full"
                placeholder="your@email.com"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input w-full"
                placeholder="••••••••"
                required
                minLength={6}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <p className="text-text-tertiary text-[11px] mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input w-full"
                placeholder="••••••••"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="inviteCode" className="form-label">Invite Code</label>
              <input
                type="text"
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="form-input w-full font-mono"
                placeholder="ABCD1234"
                required
                disabled={isLoading}
                autoCapitalize="characters"
              />
              <p className="text-text-tertiary text-[11px] mt-1">
                {codeFromUrl ? 'Pre-filled from your invite link.' : 'Ask your club admin for an invite code.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="eastside-btn w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ padding: '12px 18px', fontSize: '14px' }}
            >
              {isLoading ? (
                'Creating Account…'
              ) : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-card-border text-center">
            <p className="text-text-secondary text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold hover:underline"
                style={{ color: 'var(--crimson-3)' }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
