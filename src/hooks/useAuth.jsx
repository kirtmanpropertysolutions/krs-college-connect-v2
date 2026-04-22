import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // Start with loading=true
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let isMounted = true
    let timeoutId

    // Helper to clear stale session and reset to login
    const clearStaleSession = async () => {
      console.log('🧹 useAuth: Clearing stale session')
      try {
        await supabase.auth.signOut({ scope: 'global' })
        localStorage.clear()
      } catch (error) {
        console.error('Error clearing stale session:', error)
      }
      setSession(null)
      setUser(null)
      setProfile(null)
      setLoading(false)
    }

    // Initialize auth state with timeout protection
    const initializeAuth = async () => {
      try {
        console.log('🚀 useAuth: Starting auth initialization with 5s timeout')

        const { data: { session }, error } = await supabase.auth.getSession()

        if (!isMounted) return

        if (error) {
          console.error('❌ useAuth: Error getting session:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            fullError: error
          })
          await clearStaleSession()
          return
        }

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          console.log('👤 useAuth: Session found, loading profile with timeout')
          try {
            // Load profile with timeout protection
            await Promise.race([
              loadUserProfile(session.user.id),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile loading timeout')), 3000)
              )
            ])
          } catch (profileError) {
            console.error('❌ useAuth: Profile loading failed/timed out:', profileError.message)
            // If profile loading fails, treat session as stale
            await clearStaleSession()
            return
          }
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error('💥 useAuth: Error initializing auth:', {
          message: error.message,
          stack: error.stack,
          fullError: error
        })
        await clearStaleSession()
      } finally {
        // ALWAYS resolve loading state
        if (isMounted) {
          console.log('✅ useAuth: Auth initialization complete, setting loading=false')
          setLoading(false)
        }
      }
    }

    // Timeout wrapper for entire auth initialization
    const initializeAuthWithTimeout = async () => {
      try {
        await Promise.race([
          initializeAuth(),
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error('Auth initialization timeout after 5 seconds'))
            }, 5000)
          })
        ])
      } catch (timeoutError) {
        console.error('⏰ useAuth: Auth initialization timed out:', timeoutError.message)
        if (isMounted) {
          await clearStaleSession()
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
      }
    }

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      console.log('Auth state change:', event, session?.user?.id)

      // Handle different auth events
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          try {
            // Load profile with timeout protection in auth state changes too
            await Promise.race([
              loadUserProfile(session.user.id),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile loading timeout in auth change')), 3000)
              )
            ])
          } catch (profileError) {
            console.error('❌ useAuth: Profile loading failed/timed out in auth change:', profileError.message)
            await clearStaleSession()
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        setProfile(null)
      }
    })

    // Initialize auth state with timeout protection
    initializeAuthWithTimeout()

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const loadUserProfile = async (userId) => {
    console.log('👤 useAuth: Loading user profile for userId:', userId)
    try {
      // Step 1: Load profile data with timeout
      console.log('🔍 useAuth: Executing profile query')
      const profileQuery = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const { data: profileData, error: profileError } = await Promise.race([
        profileQuery,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile query timeout')), 3000)
        )
      ])

      if (profileError) {
        console.error('❌ useAuth: Profile query error:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          fullError: profileError
        })
        return
      }

      console.log('✅ useAuth: Profile loaded successfully:', profileData)

      // Step 2: Load org membership data with timeout
      console.log('🔍 useAuth: Executing org_members query')
      const orgMemberQuery = supabase
        .from('org_members')
        .select('org_id, role')
        .eq('user_id', userId)
        .maybeSingle()

      const { data: orgMemberData, error: orgMemberError } = await Promise.race([
        orgMemberQuery,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Org member query timeout')), 3000)
        )
      ])

      if (orgMemberError) {
        console.error('❌ useAuth: Org member query error:', {
          code: orgMemberError.code,
          message: orgMemberError.message,
          fullError: orgMemberError
        })
        // Continue with profile data only
      }

      console.log('✅ useAuth: Org member data loaded:', orgMemberData)

      // Step 3: Load athlete data with timeout
      console.log('🔍 useAuth: Executing athletes query')
      const athleteQuery = supabase
        .from('athletes')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      const { data: athleteData, error: athleteError } = await Promise.race([
        athleteQuery,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Athlete query timeout')), 3000)
        )
      ])

      if (athleteError) {
        console.error('❌ useAuth: Athlete query error:', {
          code: athleteError.code,
          message: athleteError.message,
          fullError: athleteError
        })
        // Continue without athlete data
      }

      console.log('✅ useAuth: Athlete data loaded:', athleteData)

      // Step 4: Merge all results
      const mergedProfile = {
        ...profileData,
        org_id: orgMemberData?.org_id,
        role: orgMemberData?.role,
        athlete: athleteData
      }

      console.log('✅ useAuth: Merged profile data:', mergedProfile)
      setProfile(mergedProfile)

    } catch (error) {
      console.error('💥 useAuth: Exception in loadUserProfile:', {
        message: error.message,
        stack: error.stack,
        fullError: error
      })
    }
  }

  const signUp = async (email, password, inviteCode) => {
    try {
      // First, create the auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error || !data.user) {
        return { data, error }
      }

      // If auth user creation succeeds, validate invite code and create profile via server-side API
      const response = await fetch('/api/admin/validate-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCode: inviteCode,
          userId: data.user.id
        }),
      })

      const inviteResult = await response.json()

      if (!response.ok || !inviteResult.success) {
        // If invite validation fails, we should clean up the auth user
        // but Supabase doesn't provide a way to delete users from client-side
        // The auth user will exist but won't have profile/org_member records
        return {
          data: null,
          error: { message: inviteResult.error || 'Invalid invite code' }
        }
      }

      // Success - invite validated, profile and org_member created
      return { data, error: null }

    } catch (error) {
      console.error('Signup error:', error)
      return {
        data: null,
        error: { message: 'Signup failed. Please try again.' }
      }
    }
  }

  const signIn = async (email, password) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    })
  }

  const signOut = async () => {
    try {
      // (a) Sign out from Supabase with global scope first
      await supabase.auth.signOut({ scope: 'global' })

      // (b) Clear all localStorage
      localStorage.clear()

      // (c) Hard redirect to root
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      // Even if signOut fails, clear local state and redirect
      localStorage.clear()
      window.location.href = '/'
    }
  }

  const value = {
    session,
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin: profile?.role === 'admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// THE canonical auth hook - do not fork this
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}