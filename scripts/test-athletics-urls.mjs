// Test script to verify athletics URL coverage
const VERIFIED_ATHLETICS_URLS = {
  "University of Southern California": "https://usctrojans.com/sports/womens-soccer",
  "USC": "https://usctrojans.com/sports/womens-soccer",
  "University of Washington": "https://gohuskies.com/sports/womens-soccer",
  "University of California, Los Angeles": "https://uclabruins.com/sports/womens-soccer",
  "UCLA": "https://uclabruins.com/sports/womens-soccer",
  "Oregon State University": "https://osubeavers.com/sports/womens-soccer",
  "Washington State University": "https://wsucougars.com/sports/womens-soccer",
  "Northwestern University": "https://nusports.com/sports/womens-soccer",
  "Pennsylvania State University": "https://gopsusports.com/sports/womens-soccer",
  "Penn State": "https://gopsusports.com/sports/womens-soccer",
  "Adams State University": "https://gogrizzlies.com/sports/womens-soccer",
  "Adams State": "https://gogrizzlies.com/sports/womens-soccer",
  "Seattle Pacific University": "https://spufalcons.com/sports/womens-soccer",
  "Seattle Pacific": "https://spufalcons.com/sports/womens-soccer",
  "Academy of Art University": "https://academyartathletics.com",
  "Simon Fraser University": "https://sfuathletics.ca/sports/womens-soccer",
  "Portland Community College": "https://athletics.pcc.edu",
  "University of Colorado Boulder": "https://cubuffs.com/sports/womens-soccer",
  "University of Arizona": "https://arizonawildcats.com/sports/womens-soccer",
  "Arizona State University": "https://thesundevils.com/sports/womens-soccer",
  "University of Oregon": "https://goducks.com/sports/womens-soccer",
  "Rutgers University": "https://scarletknights.com/sports/womens-soccer",
  "University of Maryland": "https://umterps.com/sports/womens-soccer",
  "University of Michigan": "https://mgoblue.com/sports/womens-soccer"
}

const getAthleticsUrl = (schoolName) => {
  if (VERIFIED_ATHLETICS_URLS[schoolName]) {
    return VERIFIED_ATHLETICS_URLS[schoolName]
  }
  return `https://www.google.com/search?q=${encodeURIComponent(schoolName + ' women\'s soccer athletics')}`
}

// Test common school names
const testSchools = [
  "USC",
  "UCLA",
  "University of Washington",
  "Oregon State University",
  "Adams State",
  "Seattle Pacific",
  "Random School Not In Map"
]

console.log('🔗 Testing athletics URL mapping:')
testSchools.forEach(school => {
  const url = getAthleticsUrl(school)
  const isVerified = VERIFIED_ATHLETICS_URLS[school] ? '✅' : '🔍'
  console.log(`${isVerified} ${school}: ${url}`)
})

console.log(`\n📊 ${Object.keys(VERIFIED_ATHLETICS_URLS).length} schools in verified map`)
console.log('✅ URL mapping test complete')