import { config } from 'dotenv'

config({ path: '.env.local' })

const FALLBACK_ATHLETICS_URLS = {
  "Adams State": "https://gogrizzlies.com/sports/womens-soccer",
  "Seattle Pacific": "https://gospufalcons.com/sports/womens-soccer",
  "Academy of Art": "https://academyartathletics.com/sports/womens-soccer",
  "Simon Fraser": "https://gosfu.com/sports/womens-soccer",
  "Portland CC": "https://athletics.pcc.edu/sports/womens-soccer",
  "Washington State": "https://wsucougars.com/sports/womens-soccer"
}

console.log('🔍 Verifying fallback athletics URLs...')

for (const [school, url] of Object.entries(FALLBACK_ATHLETICS_URLS)) {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    if (response.ok) {
      console.log(`✅ ${school}: ${url}`)
    } else {
      console.log(`❌ ${school}: ${url} (${response.status})`)
    }
  } catch (error) {
    console.log(`❌ ${school}: ${url} (${error.message})`)
  }
}

console.log('✅ URL verification complete')