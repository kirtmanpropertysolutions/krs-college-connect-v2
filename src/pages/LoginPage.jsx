import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/authContext'
import EastsideFCLogo from '../components/EastsideFC_Logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { error } = await signIn(email, password)

      if (error) {
        setError(error.message)
      } else {
        navigate('/', { replace: true })
      }
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center p-6 relative">
      <div className="max-w-5xl w-full grid md:grid-cols-[1.1fr_1fr] gap-16 items-center">
        {/* LEFT — Brand pitch */}
        <div className="hidden md:block">
          {/* Eyebrow rule — editorial flourish */}
          <div className="flex items-center gap-3 mb-7">
            <div className="h-px w-10" style={{ background: 'var(--crimson)' }} />
            <div className="text-[10px] tracking-[0.25em] uppercase font-bold" style={{ color: 'var(--crimson)' }}>
              KRS · ECNL Recruiting
            </div>
          </div>

          {/* Club crest — hero treatment. The radial crimson halo turns
              the logo into a ceremonial element, not just a decoration.
              Larger size (96px) and centered framing make the moment of
              landing on the login page feel like walking into a clubhouse. */}
          <div className="flex items-start gap-5 mb-9">
            <div className="relative flex-shrink-0">
              <div
                className="absolute inset-0 -m-3 rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, rgba(200,16,46,0.25) 0%, transparent 65%)',
                }}
              />
              <div
                className="relative rounded-2xl p-2 border border-red-900/30"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(200,16,46,0.08) 0%, rgba(10,14,26,0.4) 100%)',
                }}
              >
                <EastsideFCLogo size={96} />
              </div>
            </div>
            <div className="pt-2">
              <div className="display-font text-2xl tracking-[0.08em] text-fg-primary leading-tight">
                Eastside FC
              </div>
              <div className="display-font text-2xl tracking-[0.08em] text-fg-primary leading-tight">
                Washington
              </div>
              <div className="text-[10px] text-text-secondary tracking-[0.2em] uppercase mt-2 font-semibold">
                Est. 1970 · Bellevue, WA
              </div>
            </div>
          </div>

          <h1 className="display-font text-[64px] leading-[0.98] mb-6 text-fg-primary tracking-[-0.005em]">
            Every recruit.
            <br />
            <span style={{ color: 'var(--crimson)' }}>Every program.</span>
            <br />
            One playbook.
          </h1>

          <p className="text-[17px] text-text-secondary max-w-md mb-8 leading-relaxed">
            The recruiting platform for your club. Coach contacts, college fit, video,
            outreach — all in one place. Send from your own email. Replies land in your inbox.
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="chip chip-crimson">ECNL exclusive</span>
            <span className="chip chip-slate">D1 · D2 · D3 · NAIA</span>
            <span className="chip chip-slate">Coach contacts included</span>
          </div>
        </div>

        {/* RIGHT — Sign-in card */}
        <div className="hero-card p-9 max-w-md w-full mx-auto md:mx-0">
          {/* Mobile crest — only shown when left column is hidden.
              On mobile the crest IS the brand moment, so we give it
              center-stage with the same halo treatment as desktop. */}
          <div className="flex md:hidden flex-col items-center mb-7 pb-6 border-b border-card-border">
            <div className="relative mb-3">
              <div
                className="absolute inset-0 -m-3 rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, rgba(200,16,46,0.25) 0%, transparent 65%)',
                }}
              />
              <EastsideFCLogo size={80} className="relative" />
            </div>
            <div className="display-font text-xl tracking-[0.08em] text-fg-primary text-center">
              Eastside FC
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-secondary mt-1">
              Recruiting Platform
            </div>
          </div>

          <div className="flex items-center gap-3 mb-1">
            <div className="h-px w-6" style={{ background: 'var(--crimson)' }} />
            <div className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>
              Welcome back
            </div>
          </div>
          <h2 className="display-font text-[26px] text-fg-primary mb-7 leading-tight">
            Sign in to your club
          </h2>

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
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input w-full"
                placeholder="••••••••"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="eastside-btn w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ padding: '12px 18px', fontSize: '14px' }}
            >
              {isLoading ? 'Signing In…' : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              to="/forgot-password"
              className="text-text-tertiary text-xs hover:text-fg-primary transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-card-border text-center">
            <p className="text-text-secondary text-sm">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-semibold hover:underline"
                style={{ color: 'var(--crimson-3)' }}
              >
                Sign up with invite code
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
