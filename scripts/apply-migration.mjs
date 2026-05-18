import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'

// Explicitly load .env.local
config({ path: '.env.local' })

// Check environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars in .env.local')
  process.exit(1)
}

console.log('🔌 Connecting to Supabase...')

try {
  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  })

  console.log('📖 Reading migration file...')
  const migrationSQL = await readFile('supabase/migrations/024_highlights.sql', 'utf8')

  console.log('⚡ Applying migration...')

  // Try to execute via direct SQL request to the database
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: migrationSQL })
  })

  if (!response.ok) {
    // If exec_sql RPC doesn't exist, try breaking into statements
    console.log('🔄 Direct SQL execution not available, trying statement by statement...')

    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)

        // For DDL statements, we need to use the Supabase SQL API directly
        const stmtResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/vnd.pgrst.object+json',
          },
          body: JSON.stringify({ query: statement })
        })

        if (!stmtResponse.ok) {
          const error = await stmtResponse.text()
          console.error(`❌ Failed to execute statement: ${error}`)

          // If that doesn't work either, manual creation via dashboard is needed
          console.log(`\n📋 Please execute this statement manually in the Supabase SQL Editor:`)
          console.log(`${statement}\n`)
        } else {
          console.log('✅ Success')
        }
      }
    }
  } else {
    console.log('✅ Migration applied successfully')
  }

  // Verify the table exists
  console.log('🔍 Verifying highlights table...')
  const { error } = await supabase
    .from('highlights')
    .select('id')
    .limit(1)

  if (error) {
    console.error('❌ highlights table verification failed:', error.message)
    console.log('\n📋 Please manually create the highlights table via Supabase Dashboard:')
    console.log('1. Go to https://supabase.com/dashboard/project/[your-project]/sql')
    console.log('2. Paste the contents of supabase/migrations/024_highlights.sql')
    console.log('3. Click "Run"')
  } else {
    console.log('✅ highlights table exists and is accessible!')
  }

} catch (error) {
  console.error('💥 Migration failed:', error.message)
  console.log('\n📋 Please manually apply migration via Supabase Dashboard:')
  console.log('1. Go to your Supabase project dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Run the migration file: supabase/migrations/024_highlights.sql')
}