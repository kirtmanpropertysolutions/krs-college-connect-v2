/**
 * sync-env-to-vercel.mjs
 *
 * Reads .env.local, pushes every variable into Vercel for Production, Preview,
 * AND Development environments via `vercel env add` (no clicking through the
 * dashboard required).
 *
 * Prerequisites:
 *   - `vercel login` already done
 *   - `vercel link` already done (project is linked to krs-college-connect)
 *   - .env.local exists with KEY=value lines
 *
 * Usage:
 *   node scripts/sync-env-to-vercel.mjs
 *
 * Safe to re-run: if a variable already exists in Vercel, that one is skipped
 * (the CLI returns non-zero and we just note it). Use Vercel dashboard to
 * remove + re-add an existing var if you need to change its value.
 */

import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_FILE = join(__dirname, '..', '.env.local')

if (!existsSync(ENV_FILE)) {
  console.error('❌  .env.local not found at', ENV_FILE)
  process.exit(1)
}

// Parse .env.local into [{ key, value }, ...]
const raw = readFileSync(ENV_FILE, 'utf8')
const vars = raw
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const idx = line.indexOf('=')
    if (idx === -1) return null
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    return key && value ? { key, value } : null
  })
  .filter(Boolean)

if (vars.length === 0) {
  console.error('❌  No variables found in .env.local')
  process.exit(1)
}

console.log(`📋 Found ${vars.length} env vars to sync:\n`)
for (const { key, value } of vars) {
  console.log(`   ${key}  ·  ${value.length} chars`)
}
console.log('')

const ENVIRONMENTS = ['production', 'preview', 'development']
let added = 0
let skipped = 0

for (const { key, value } of vars) {
  for (const env of ENVIRONMENTS) {
    process.stdout.write(`  → ${key} (${env})... `)

    const result = spawnSync('vercel', ['env', 'add', key, env], {
      input: value + '\n',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    if (result.status === 0) {
      console.log('✓ added')
      added++
    } else {
      // Most common cause: already exists for this env. Vercel's error message
      // contains "already exists" in that case.
      const stderr = (result.stderr || '') + (result.stdout || '')
      if (/already exists/i.test(stderr)) {
        console.log('· skipped (already set)')
      } else {
        console.log(`× failed: ${stderr.trim().slice(0, 100)}`)
      }
      skipped++
    }
  }
}

console.log('\n' + '='.repeat(50))
console.log(`✅  Sync complete — added: ${added}, skipped: ${skipped}`)
console.log('='.repeat(50))
console.log('\nNext step:  vercel --prod')
