import 'dotenv/config'
import { config } from 'dotenv'
import { readFile } from 'fs/promises'

// Load .env.local explicitly
config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// Extract project ref from URL: https://vhndqfsbhhfnpinixofe.supabase.co
const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
console.log(`🔌 Project ref: ${projectRef}`)

const migrationPath = 'supabase/migrations/035_performance_indexes.sql'
console.log(`📖 Reading ${migrationPath}...`)
const sql = await readFile(migrationPath, 'utf8')

// Split into individual statements (each CREATE INDEX / ANALYZE)
const statements = sql
  .split('\n')
  .filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('#'))
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0)

console.log(`⚡ Found ${statements.length} SQL statements to apply\n`)

let successCount = 0
let skipCount = 0
let failCount = 0
const failedStatements = []

for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 70)

  // Try the Supabase Management API (requires service role for SQL execution)
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: stmt + ';' }),
  })

  if (response.ok) {
    console.log(`  ✅ ${preview}`)
    successCount++
  } else {
    const errText = await response.text()
    // If it's "already exists" that's fine
    if (errText.includes('already exists')) {
      console.log(`  ⏭  ${preview} (already exists)`)
      skipCount++
    } else {
      console.log(`  ❌ FAILED: ${preview}`)
      console.log(`     Error: ${errText.slice(0, 200)}`)
      failCount++
      failedStatements.push(stmt)
    }
  }
}

console.log(`\n📊 Results: ${successCount} applied, ${skipCount} skipped, ${failCount} failed`)

if (failedStatements.length > 0) {
  console.log('\n⚠️  Some statements need to be applied manually.')
  console.log('📋 Run this SQL in the Supabase SQL Editor:')
  console.log('   https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n')
  console.log('─'.repeat(60))
  console.log(failedStatements.join(';\n\n') + ';')
  console.log('─'.repeat(60))
} else {
  console.log('✅ All done!')
}
