import { createContext, useContext } from 'react'

/**
 * Shared React context for auth/session state. The provider lives in
 * `useAuth.jsx` (which exports only the AuthProvider component so that
 * react-refresh works); the context object + the consumer hook are
 * extracted here so a .jsx component file isn't mixing component + non-
 * component exports.
 */
export const AuthContext = createContext({})

/**
 * THE canonical auth hook — do not fork this.
 *
 * Returns { session, user, profile, loading, signUp, signIn, signOut, isAdmin }
 * from the nearest <AuthProvider>. Throws if used outside the provider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
