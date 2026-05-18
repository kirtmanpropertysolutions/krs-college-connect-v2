import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing env'); process.exit(1) }

const supabase = createClient(url, key)

console.log('🧪 Testing highlights save after org_id fix...')

// Test that we can now insert without org_id
const { error: insertErr } = await supabase
  .from('highlights')
  .insert({
    athlete_id: '00000000-0000-0000-0000-000000000000', // Still fake, but should show different error now
    url: 'https://www.youtube.com/watch?v=test',
    title: 'Test Highlight'
  })

if (insertErr) {
  if (insertErr.code === '23503' && insertErr.message.includes('athlete_id')) {
    console.log('✅ org_id issue FIXED! Now only failing on fake athlete_id (expected)')
    console.log('✅ Real saves from the UI should now work')
  } else if (insertErr.message.includes('org_id')) {
    console.log('❌ org_id issue still present:', insertErr.message)
  } else {
    console.log('ℹ️ Different error (may be OK):', insertErr.message)
  }
} else {
  console.log('✅ Insert succeeded (unexpected with fake UUID)')
}

console.log('\n📝 Full error details:', insertErr)