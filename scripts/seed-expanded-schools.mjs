/**
 * Expand the schools table with women's soccer programs across all NCAA + NAIA
 * divisions. Reads every JSON file from scripts/data/schools-*.json and upserts
 * to the schools table (ON CONFLICT (name) DO NOTHING — won't overwrite existing
 * rows so we never lose colors / coach links you've manually curated).
 *
 * Usage:
 *   node scripts/seed-expanded-schools.mjs
 *   node scripts/seed-expanded-schools.mjs --dry-run        # preview only
 *   node scripts/seed-expanded-schools.mjs --file=d1        # one file at a time
 *
 * Requires:
 *   - SUPABASE_URL (or VITE_SUPABASE_URL) in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Never commit .env.local — see .githooks/pre-commit for the enforcement.
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.')
  console.error('   Add them to .env.local. Never commit .env.local.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// CLI flags
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const fileFilter = args.find((a) => a.startsWith('--file='))?.split('=')[1]

// Validate against the same CHECK constraints as the DB
const VALID_DIVISIONS = new Set(['D1', 'D2', 'D3', 'NAIA', 'JUCO'])
const VALID_REGIONS = new Set([
  'Pacific Northwest',
  'California',
  'Southwest',
  'Mountain West',
  'Midwest',
  'Northeast',
  'Southeast',
  'Mid-Atlantic',
  'Ivy League'
])

function validate(row, fileName, idx) {
  if (!row.name || typeof row.name !== 'string') {
    throw new Error(`${fileName}[${idx}] missing name`)
  }
  if (!VALID_DIVISIONS.has(row.division)) {
    throw new Error(`${fileName}[${idx}] "${row.name}" invalid division: ${row.division}`)
  }
  if (row.region && !VALID_REGIONS.has(row.region)) {
    throw new Error(`${fileName}[${idx}] "${row.name}" invalid region: ${row.region}`)
  }
}

async function main() {
  console.log('🏫  KRS school expansion seed\n')
  console.log(`   Target: ${SUPABASE_URL}`)
  console.log(`   Mode:   ${dryRun ? 'DRY RUN (no writes)' : 'LIVE WRITE'}`)
  console.log('')

  // 1. Snapshot current row count
  const { count: before } = await supabase
    .from('schools')
    .select('id', { count: 'exact', head: true })
  console.log(`   Before: ${before} schools in DB`)

  // 2. Discover JSON files
  const files = readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('schools-') && f.endsWith('.json'))
    .filter((f) => !fileFilter || f.includes(fileFilter))

  if (files.length === 0) {
    console.error(`❌  No matching files in ${DATA_DIR}`)
    process.exit(1)
  }
  console.log(`   Files:  ${files.join(', ')}\n`)

  // 3. Load + validate
  let allRows = []
  for (const f of files) {
    const rows = JSON.parse(readFileSync(join(DATA_DIR, f), 'utf8'))
    rows.forEach((r, i) => validate(r, f, i))
    console.log(`   📄 ${f}: ${rows.length} schools`)
    allRows = allRows.concat(rows)
  }

  // 4. Dedupe by name within the batch (case-insensitive)
  const seen = new Set()
  const deduped = []
  for (const row of allRows) {
    const k = row.name.toLowerCase().trim()
    if (seen.has(k)) {
      console.log(`   ⚠️  duplicate in batch (skipping): ${row.name}`)
      continue
    }
    seen.add(k)
    deduped.push(row)
  }

  console.log(`\n   📦 Total unique to upsert: ${deduped.length}`)

  if (dryRun) {
    console.log('\n   Dry run — preview of first 5:')
    deduped.slice(0, 5).forEach((r) => {
      console.log(`     · ${r.division} ${r.name} (${r.conference || '—'}, ${r.state})`)
    })
    process.exit(0)
  }

  // 5. Upsert in chunks of 100 — ON CONFLICT (name) DO NOTHING preserves
  //    your existing rows (colors, coach assignments, etc.).
  const CHUNK = 100
  let inserted = 0
  let skipped = 0

  for (let i = 0; i < deduped.length; i += CHUNK) {
    const batch = deduped.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('schools')
      .upsert(batch, { onConflict: 'name', ignoreDuplicates: true })
      .select('id')
    if (error) {
      console.error(`❌  Batch ${Math.floor(i / CHUNK) + 1} failed:`, error.message)
      process.exit(1)
    }
    inserted += data?.length || 0
    skipped += batch.length - (data?.length || 0)
    console.log(`   ✓ Batch ${Math.floor(i / CHUNK) + 1}: +${data?.length || 0} new, ${batch.length - (data?.length || 0)} already existed`)
  }

  // 6. Final count
  const { count: after } = await supabase
    .from('schools')
    .select('id', { count: 'exact', head: true })

  console.log(`\n✅  Done — schools table now has ${after} rows (was ${before}, +${after - before})`)
  console.log(`    Inserted: ${inserted}, Already existed: ${skipped}`)
}

main().catch((e) => {
  console.error('❌  Fatal:', e)
  process.exit(1)
})
