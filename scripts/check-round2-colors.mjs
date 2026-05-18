import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const conferences = ['Sun Belt', 'MAC', 'Mountain West']

const { data: schools, error } = await supabase
  .from('schools')
  .select('name, short_name, conference, primary_color, secondary_color')
  .in('conference', conferences)
  .order('conference')
  .order('name')

if (error) {
  console.error('DB error:', error.message)
  process.exit(1)
}

console.log(`Found ${schools.length} schools in Sun Belt / MAC / Mountain West\n`)

console.log('=== DB color values ===')
for (const s of schools) {
  const p = s.primary_color || '(null)'
  const sec = s.secondary_color || '(null)'
  const isBlank = !s.primary_color || !s.secondary_color
  const isPlaceholder = [s.primary_color, s.secondary_color].some(c =>
    c === '#000000' || c === '#ffffff' || c === '#FFFFFF' || c === '#FFFFFF' || c === '#ffffff'
  )
  const flag = isBlank ? '  ⚠ MISSING' : isPlaceholder ? '  ⚠ PLACEHOLDER' : ''
  console.log(`${s.conference.padEnd(14)} | ${s.name.padEnd(46)} | ${p}  ${sec}${flag}`)
}
