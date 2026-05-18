import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing env'); process.exit(1) }

const supabase = createClient(url, key)

// Try a select to introspect
const { data, error } = await supabase
  .from('highlights')
  .select('*')
  .limit(1)
console.log({ data, error })

// Try a test insert to see what columns are required/missing
console.log('Testing insert to see required columns...')
const { error: insertErr } = await supabase
  .from('highlights')
  .insert({
    athlete_id: '00000000-0000-0000-0000-000000000000', // fake UUID to see required columns
    url: 'test',
    title: 'test'
  })

console.log('Insert error reveals required columns:', insertErr)

// Try with org_id included
console.log('Testing insert WITH org_id...')
const { error: insertErr2 } = await supabase
  .from('highlights')
  .insert({
    athlete_id: '00000000-0000-0000-0000-000000000000',
    org_id: 'a0000000-0000-0000-0000-000000000001', // seed org
    url: 'test',
    title: 'test'
  })

console.log('Insert with org_id error:', insertErr2)