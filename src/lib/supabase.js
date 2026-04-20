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
  const user = await getCurrentUser()
  if (!user) return false

  const { data } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return data?.role === 'admin'
}