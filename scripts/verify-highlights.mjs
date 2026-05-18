import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Explicitly load .env.local
config({ path: '.env.local' })

// Check environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars in .env.local')
  process.exit(1)
}

console.log('🔍 Checking highlights table status...')

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

try {
  const { error } = await supabase
    .from('highlights')
    .select('id')
    .limit(1)

  if (error) {
    console.log('❌ highlights table does NOT exist')
    console.log('Error:', error.message)
    console.log('\n📋 Manual migration required:')
    console.log('1. Go to https://supabase.com/dashboard/projects')
    console.log('2. Select your project: vhndqfsbhhfnpinixofe')
    console.log('3. Navigate to SQL Editor')
    console.log('4. Copy and paste the contents of supabase/migrations/024_highlights.sql')
    console.log('5. Click "Run" to execute the migration')
    console.log('6. Re-run this script to verify: node scripts/verify-highlights.mjs')
  } else {
    console.log('✅ highlights table exists and is accessible!')
    console.log(`📊 Table can be queried successfully`)
  }

} catch (err) {
  console.error('💥 Unexpected error:', err.message)
}