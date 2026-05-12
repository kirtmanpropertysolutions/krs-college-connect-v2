import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import EastsideFCLogo from '../components/EastsideFC_Logo'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log('🚀 SignupPage: Form submission started')
    setIsLoading(true)
    setError('')

    // Validation
    console.log('📝 SignupPage: Validating form data', { email, passwordLength: password.length, inviteCode: inviteCode.trim() })

    if (password !== confirmPassword) {
      console.log('❌ SignupPage: Password mismatch')
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      console.log('❌ SignupPage: Password too short')
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    if (!inviteCode.trim()) {
      console.log('❌ SignupPage: Missing invite code')
      setError('Invite code is required')
      setIsLoading(false)
      return
    }

    try {
      console.log('🔐 SignupPage: Calling signUp function')
      const { error } = await signUp(email, password, inviteCode.trim())

      if (error) {
        console.log('❌ SignupPage: signUp returned error:', error.message)
        setError(error.message)
      } else {
        console.log('✅ SignupPage: signUp succeeded, waiting for auth state change')
      }
      // Success will be handled by auth state change
    } catch (err) {
      console.log('💥 SignupPage: Exception in signUp:', err)
      setError('Signup failed. Please try again.')
    } finally {
      setIsLoading(false)
      console.log('🏁 SignupPage: Form submission completed')
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <EastsideFCLogo className="w-16 h-16" />
          </div>
          <h1 className="display-font text-3xl text-white mb-2">
            KRS College Connect
          </h1>
          <p className="text-gray-400">Join Your Club</p>
        </div>

        {/* Signup form */}
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-6">Create Account</h2>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6">
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
                minLength="6"
                disabled={isLoading}
              />
              <p className="text-gray-500 text-xs mt-1">
                Minimum 6 characters
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input w-full"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="inviteCode" className="form-label">
                Invite Code
              </label>
              <input
                type="text"
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="form-input w-full"
                placeholder="Enter your club invite code"
                required
                disabled={isLoading}
              />
              <p className="text-gray-500 text-xs mt-1">
                Ask your club admin for an invite code
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 pt-6 border-t border-gray-700 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-club-primary hover:text-club-primary font-medium"
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