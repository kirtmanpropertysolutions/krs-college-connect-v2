import { createClient } from '@supabase/supabase-js'

// Trim environment variables to avoid whitespace/newline issues
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing Supabase environment variables')
}

// Browser-safe client using publishable key only
// NO service role key should ever be used in frontend code
export const supabase = createClient(supabaseUrl, supabasePublishableKey)

// Helper to get current user session
export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user || null
}

// Helper to check if user is admin
export const isAdmin = async () => {
  console.log('🔒 supabase.js: Checking if user is admin')
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.log('❌ supabase.js: No user found for admin check')
      return false
    }

    console.log('🔍 supabase.js: Querying org_members for admin role, userId:', user.id)
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

    console.log('✅ supabase.js: Admin check result:', { role: data?.role, isAdmin: data?.role === 'admin' })
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