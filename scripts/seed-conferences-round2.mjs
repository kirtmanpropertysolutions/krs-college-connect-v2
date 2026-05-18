/**
 * Seed Sun Belt, MAC, and Mountain West D1 women's soccer programs.
 * Round 2 expansion — previous round covered ACC, Big Ten, Big 12, Big East, Pac-12, SEC.
 *
 * Usage:
 *   node scripts/seed-conferences-round2.mjs
 *   node scripts/seed-conferences-round2.mjs --dry-run
 *
 * Requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const dryRun = process.argv.includes('--dry-run')

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOLS DATA
// ─────────────────────────────────────────────────────────────────────────────

const schools = [

  // ── SUN BELT CONFERENCE ──────────────────────────────────────────────────

  {
    name: 'Appalachian State University',
    short_name: 'App State',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'NC',
    city: 'Boone',
    region: 'Southeast',
    primary_color: '#000000',
    secondary_color: '#FFB300',
    athletics_website: 'https://appstatesports.com',
    program_email: 'wsoc@appstate.edu',
  },
  {
    name: 'Arkansas State University',
    short_name: 'Arkansas State',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'AR',
    city: 'Jonesboro',
    region: 'Southeast',
    primary_color: '#CC0000',
    secondary_color: '#000000',
    athletics_website: 'https://astateredwolves.com',
    program_email: 'wsoccer@astate.edu',
  },
  {
    name: 'Coastal Carolina University',
    short_name: 'Coastal Carolina',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'SC',
    city: 'Conway',
    region: 'Southeast',
    primary_color: '#00869B',
    secondary_color: '#A27752',
    athletics_website: 'https://goccusports.com',
    program_email: 'wsoc@coastal.edu',
  },
  {
    name: 'Georgia Southern University',
    short_name: 'Georgia Southern',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'GA',
    city: 'Statesboro',
    region: 'Southeast',
    primary_color: '#002855',
    secondary_color: '#B3A369',
    athletics_website: 'https://gseagles.com',
    program_email: 'wsoc@georgiasouthern.edu',
  },
  {
    name: 'Georgia State University',
    short_name: 'Georgia State',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'GA',
    city: 'Atlanta',
    region: 'Southeast',
    primary_color: '#003DA5',
    secondary_color: '#CC0033',
    athletics_website: 'https://georgiastatesports.com',
    program_email: 'wsoc@gsu.edu',
  },
  {
    name: 'James Madison University',
    short_name: 'James Madison',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'VA',
    city: 'Harrisonburg',
    region: 'Mid-Atlantic',
    primary_color: '#450084',
    secondary_color: '#CBB671',
    athletics_website: 'https://jmusports.com',
    program_email: 'wsoc@jmu.edu',
  },
  {
    name: 'University of Louisiana Lafayette',
    short_name: 'Louisiana',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'LA',
    city: 'Lafayette',
    region: 'Southeast',
    primary_color: '#CE181E',
    secondary_color: '#FFFFFF',
    athletics_website: 'https://ragincajuns.com',
    program_email: 'wsoc@louisiana.edu',
  },
  {
    name: 'Marshall University',
    short_name: 'Marshall',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'WV',
    city: 'Huntington',
    region: 'Mid-Atlantic',
    primary_color: '#00703C',
    secondary_color: '#FFFFFF',
    athletics_website: 'https://herdzone.com',
    program_email: 'wsoc@marshall.edu',
  },
  {
    name: 'Old Dominion University',
    short_name: 'Old Dominion',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'VA',
    city: 'Norfolk',
    region: 'Mid-Atlantic',
    primary_color: '#003087',
    secondary_color: '#A2AAAD',
    athletics_website: 'https://odusports.com',
    program_email: 'wsoc@odu.edu',
  },
  {
    name: 'University of South Alabama',
    short_name: 'South Alabama',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'AL',
    city: 'Mobile',
    region: 'Southeast',
    primary_color: '#003087',
    secondary_color: '#E8000D',
    athletics_website: 'https://usajaguars.com',
    program_email: 'wsoc@southalabama.edu',
  },
  {
    name: 'University of Southern Mississippi',
    short_name: 'Southern Miss',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'MS',
    city: 'Hattiesburg',
    region: 'Southeast',
    primary_color: '#000000',
    secondary_color: '#F0C03A',
    athletics_website: 'https://southernmiss.com',
    program_email: 'wsoc@southernmiss.edu',
  },
  {
    name: 'Texas State University',
    short_name: 'Texas State',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'TX',
    city: 'San Marcos',
    region: 'Southwest',
    primary_color: '#461748',
    secondary_color: '#BD8B13',
    athletics_website: 'https://txstatebobcats.com',
    program_email: 'wsoc@txstate.edu',
  },
  {
    name: 'Troy University',
    short_name: 'Troy',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'AL',
    city: 'Troy',
    region: 'Southeast',
    primary_color: '#8C0033',
    secondary_color: '#A2AAAD',
    athletics_website: 'https://troytrojans.com',
    program_email: 'wsoc@troy.edu',
  },
  {
    name: 'University of Louisiana Monroe',
    short_name: 'ULM',
    division: 'D1',
    conference: 'Sun Belt',
    state: 'LA',
    city: 'Monroe',
    region: 'Southeast',
    primary_color: '#660033',
    secondary_color: '#C5963E',
    athletics_website: 'https://ulmwarhawks.com',
    program_email: 'wsoc@ulm.edu',
  },

  // ── MAC (MID-AMERICAN CONFERENCE) ────────────────────────────────────────

  {
    name: 'University of Akron',
    short_name: 'Akron',
    division: 'D1',
    conference: 'MAC',
    state: 'OH',
    city: 'Akron',
    region: 'Midwest',
    primary_color: '#003087',
    secondary_color: '#F1A81A',
    athletics_website: 'https://gozips.com',
    program_email: 'wsoc@uakron.edu',
  },
  {
    name: 'Ball State University',
    short_name: 'Ball State',
    division: 'D1',
    conference: 'MAC',
    state: 'IN',
    city: 'Muncie',
    region: 'Midwest',
    primary_color: '#BA0C2F',
    secondary_color: '#FFFFFF',
    athletics_website: 'https://ballstatesports.com',
    program_email: 'wsoc@bsu.edu',
  },
  {
    name: 'Bowling Green State University',
    short_name: 'Bowling Green',
    division: 'D1',
    conference: 'MAC',
    state: 'OH',
    city: 'Bowling Green',
    region: 'Midwest',
    primary_color: '#F17B00',
    secondary_color: '#3C2716',
    athletics_website: 'https://bgsufalcons.com',
    program_email: 'wsoc@bgsu.edu',
  },
  {
    name: 'University at Buffalo',
    short_name: 'Buffalo',
    division: 'D1',
    conference: 'MAC',
    state: 'NY',
    city: 'Buffalo',
    region: 'Northeast',
    primary_color: '#005BBB',
    secondary_color: '#FFFFFF',
    athletics_website: 'https://ubbulls.com',
    program_email: 'wsoc@buffalo.edu',
  },
  {
    name: 'Central Michigan University',
    short_name: 'Central Michigan',
    division: 'D1',
    conference: 'MAC',
    state: 'MI',
    city: 'Mount Pleasant',
    region: 'Midwest',
    primary_color: '#6A0032',
    secondary_color: '#FFC82E',
    athletics_website: 'https://cmuchippewas.com',
    program_email: 'wsoc@cmich.edu',
  },
  {
    name: 'Eastern Michigan University',
    short_name: 'Eastern Michigan',
    division: 'D1',
    conference: 'MAC',
    state: 'MI',
    city: 'Ypsilanti',
    region: 'Midwest',
    primary_color: '#006A4D',
    secondary_color: '#FFFFFF',
    athletics_website: 'https://emueagles.com',
    program_email: 'wsoc@emich.edu',
  },
  {
    name: 'Kent State University',
    short_name: 'Kent State',
    division: 'D1',
    conference: 'MAC',
    state: 'OH',
    city: 'Kent',
    region: 'Midwest',
    primary_color: '#002664',
    secondary_color: '#EAAA00',
    athletics_website: 'https://kentstatesports.com',
    program_email: 'wsoc@kent.edu',
  },
  {
    name: 'Miami University',
    short_name: 'Miami (OH)',
    division: 'D1',
    conference: 'MAC',
    state: 'OH',
    city: 'Oxford',
    region: 'Midwest',
    primary_color: '#B61E2E',
    secondary_color: '#FFFFFF',
    athletics_website: 'https://miamiredhawks.com',
    program_email: 'wsoc@miamioh.edu',
  },
  {
    name: 'Northern Illinois University',
    short_name: 'NIU',
    division: 'D1',
    conference: 'MAC',
    state: 'IL',
    city: 'DeKalb',
    region: 'Midwest',
    primary_color: '#CE1126',
    secondary_color: '#000000',
    athletics_website: 'https://niuhuskies.com',
    program_email: 'wsoc@niu.edu',
  },
  {
    name: 'Ohio University',
    short_name: 'Ohio',
    division: 'D1',
    conference: 'MAC',
    state: 'OH',
    city: 'Athens',
    region: 'Midwest',
    primary_color: '#00694E',
    secondary_color: '#FFFFFF',
    athletics_website: 'https://ohiobobcats.com',
    program_email: 'wsoc@ohio.edu',
  },
  {
    name: 'University of Toledo',
    short_name: 'Toledo',
    division: 'D1',
    conference: 'MAC',
    state: 'OH',
    city: 'Toledo',
    region: 'Midwest',
    primary_color: '#003087',
    secondary_color: '#FFCC00',
    athletics_website: 'https://utrockets.com',
    program_email: 'wsoc@utoledo.edu',
  },
  {
    name: 'Western Michigan University',
    short_name: 'Western Michigan',
    division: 'D1',
    conference: 'MAC',
    state: 'MI',
    city: 'Kalamazoo',
    region: 'Midwest',
    primary_color: '#4B2B1A',
    secondary_color: '#F1A81A',
    athletics_website: 'https://wmubroncos.com',
    program_email: 'wsoc@wmich.edu',
  },

  // ── MOUNTAIN WEST CONFERENCE ─────────────────────────────────────────────

  {
    name: 'United States Air Force Academy',
    short_name: 'Air Force',
    division: 'D1',
    conference: 'Mountain West',
    state: 'CO',
    city: 'Colorado Springs',
    region: 'Mountain West',
    primary_color: '#003087',
    secondary_color: '#A2AAAD',
    athletics_website: 'https://goairforcefalcons.com',
    program_email: 'wsoc@usafa.edu',
  },
  {
    name: 'Boise State University',
    short_name: 'Boise State',
    division: 'D1',
    conference: 'Mountain West',
    state: 'ID',
    city: 'Boise',
    region: 'Mountain West',
    primary_color: '#0033A0',
    secondary_color: '#F47B20',
    athletics_website: 'https://broncosports.com',
    program_email: 'wsoc@boisestate.edu',
  },
  {
    name: 'Colorado State University',
    short_name: 'Colorado State',
    division: 'D1',
    conference: 'Mountain West',
    state: 'CO',
    city: 'Fort Collins',
    region: 'Mountain West',
    primary_color: '#1E4D2B',
    secondary_color: '#C8C372',
    athletics_website: 'https://csurams.com',
    program_email: 'wsoc@colostate.edu',
  },
  {
    name: 'Fresno State University',
    short_name: 'Fresno State',
    division: 'D1',
    conference: 'Mountain West',
    state: 'CA',
    city: 'Fresno',
    region: 'California',
    primary_color: '#CC0033',
    secondary_color: '#003087',
    athletics_website: 'https://gobulldogs.com',
    program_email: 'wsoc@fresnostate.edu',
  },
  {
    name: 'University of Hawaii',
    short_name: 'Hawaii',
    division: 'D1',
    conference: 'Mountain West',
    state: 'HI',
    city: 'Honolulu',
    region: 'Pacific Northwest',
    primary_color: '#024731',
    secondary_color: '#FFFFFF',
    athletics_website: 'https://hawaiiathletics.com',
    program_email: 'wsoc@hawaii.edu',
  },
  {
    name: 'University of Nevada',
    short_name: 'Nevada',
    division: 'D1',
    conference: 'Mountain West',
    state: 'NV',
    city: 'Reno',
    region: 'Mountain West',
    primary_color: '#003087',
    secondary_color: '#A2AAAD',
    athletics_website: 'https://nevadawolfpack.com',
    program_email: 'wsoc@unr.edu',
  },
  {
    name: 'University of New Mexico',
    short_name: 'New Mexico',
    division: 'D1',
    conference: 'Mountain West',
    state: 'NM',
    city: 'Albuquerque',
    region: 'Southwest',
    primary_color: '#BA0C2F',
    secondary_color: '#A2AAAD',
    athletics_website: 'https://golobos.com',
    program_email: 'wsoc@unm.edu',
  },
  {
    name: 'San Diego State University',
    short_name: 'San Diego State',
    division: 'D1',
    conference: 'Mountain West',
    state: 'CA',
    city: 'San Diego',
    region: 'California',
    primary_color: '#A6192E',
    secondary_color: '#000000',
    athletics_website: 'https://goaztecs.com',
    program_email: 'wsoc@sdsu.edu',
  },
  {
    name: 'University of Nevada Las Vegas',
    short_name: 'UNLV',
    division: 'D1',
    conference: 'Mountain West',
    state: 'NV',
    city: 'Las Vegas',
    region: 'Southwest',
    primary_color: '#CF0A2C',
    secondary_color: '#A2AAAD',
    athletics_website: 'https://unlvrebels.com',
    program_email: 'wsoc@unlv.edu',
  },
  {
    name: 'Utah State University',
    short_name: 'Utah State',
    division: 'D1',
    conference: 'Mountain West',
    state: 'UT',
    city: 'Logan',
    region: 'Mountain West',
    primary_color: '#00263A',
    secondary_color: '#FFFFFF',
    athletics_website: 'https://utahstateaggies.com',
    program_email: 'wsoc@usu.edu',
  },
  {
    name: 'University of Wyoming',
    short_name: 'Wyoming',
    division: 'D1',
    conference: 'Mountain West',
    state: 'WY',
    city: 'Laramie',
    region: 'Mountain West',
    primary_color: '#4E2B1E',
    secondary_color: '#FFC425',
    athletics_website: 'https://gowyo.com',
    program_email: 'wsoc@uwyo.edu',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const sunBelt = schools.filter((s) => s.conference === 'Sun Belt')
  const mac = schools.filter((s) => s.conference === 'MAC')
  const mw = schools.filter((s) => s.conference === 'Mountain West')

  console.log('🏫  KRS Conference Round 2 Seed\n')
  console.log(`   Target: ${SUPABASE_URL}`)
  console.log(`   Mode:   ${dryRun ? 'DRY RUN (no writes)' : 'LIVE WRITE'}`)
  console.log(`\n   Sun Belt: ${sunBelt.length} schools`)
  console.log(`   MAC:      ${mac.length} schools`)
  console.log(`   Mtn West: ${mw.length} schools`)
  console.log(`   Total:    ${schools.length} schools\n`)

  if (dryRun) {
    schools.forEach((s) => console.log(`   · ${s.division} | ${s.conference.padEnd(14)} | ${s.state} | ${s.name}`))
    console.log('\n✅  Dry run complete — no writes performed.')
    return
  }

  const { count: before } = await supabase
    .from('schools')
    .select('id', { count: 'exact', head: true })
  console.log(`   Before: ${before} schools in DB\n`)

  const CHUNK = 50
  let inserted = 0
  let skipped = 0

  for (let i = 0; i < schools.length; i += CHUNK) {
    const batch = schools.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('schools')
      .upsert(batch, { onConflict: 'name', ignoreDuplicates: true })
      .select('id')
    if (error) {
      console.error(`❌  Batch failed:`, error.message)
      process.exit(1)
    }
    inserted += data?.length || 0
    skipped += batch.length - (data?.length || 0)
    console.log(`   ✓ Batch ${Math.floor(i / CHUNK) + 1}: +${data?.length || 0} new, ${batch.length - (data?.length || 0)} already existed`)
  }

  const { count: after } = await supabase
    .from('schools')
    .select('id', { count: 'exact', head: true })

  console.log(`\n✅  Done — schools table now has ${after} rows (was ${before}, +${after - before})`)
  console.log(`    Inserted: ${inserted} | Already existed: ${skipped}`)
}

main().catch((e) => {
  console.error('❌  Fatal:', e)
  process.exit(1)
})
