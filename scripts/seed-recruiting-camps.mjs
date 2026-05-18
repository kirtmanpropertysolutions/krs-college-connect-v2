import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing env'); process.exit(1) }

const supabase = createClient(url, key)

const schools = [
  {n:"Florida State", c:"ACC", r:1, u:"https://seminoles.com/sports/womens-soccer", est:425},
  {n:"North Carolina", c:"ACC", r:2, u:"https://goheels.com/sports/womens-soccer", est:425},
  {n:"Virginia", c:"ACC", r:3, u:"https://virginiasports.com/sports/womens-soccer/", est:425},
  {n:"UCLA", c:"Big Ten", r:4, u:"https://uclabruins.com/sports/womens-soccer", est:475},
  {n:"Duke", c:"ACC", r:5, u:"https://goduke.com/sports/womens-soccer", est:475},
  {n:"TCU", c:"Big 12", r:6, u:"https://gofrogs.com/sports/womens-soccer", est:375},
  {n:"Penn State", c:"Big Ten", r:7, u:"https://gopsusports.com/sports/womens-soccer", est:425},
  {n:"Georgetown", c:"Big East", r:8, u:"https://guhoyas.com/sports/womens-soccer", est:425},
  {n:"Santa Clara", c:"WCC", r:9, u:"https://santaclarabroncos.com/sports/womens-soccer", est:325},
  {n:"Stanford", c:"ACC", r:10, u:"https://gostanford.com/sports/womens-soccer", est:475},
  {n:"South Carolina", c:"SEC", r:11, u:"https://gamecocksonline.com/sports/womens-soccer", est:375},
  {n:"BYU", c:"Big 12", r:12, u:"https://byucougars.com/sports/womens-soccer", est:325},
  {n:"USC", c:"Big Ten", r:13, u:"https://usctrojans.com/sports/womens-soccer", est:425},
  {n:"Arkansas", c:"SEC", r:14, u:"https://arkansasrazorbacks.com/sport/w-soccer/", est:325},
  {n:"Notre Dame", c:"ACC", r:15, u:"https://und.com/sports/womens-soccer/", est:425},
  {n:"Michigan", c:"Big Ten", r:16, u:"https://mgoblue.com/sports/womens-soccer", est:425},
  {n:"Mississippi State", c:"SEC", r:17, u:"https://hailstate.com/sports/womens-soccer", est:325},
  {n:"Texas", c:"SEC", r:18, u:"https://texaslonghorns.com/sports/womens-soccer", est:425},
  {n:"Oklahoma State", c:"Big 12", r:19, u:"https://okstate.com/sports/womens-soccer", est:325},
  {n:"Pittsburgh", c:"ACC", r:20, u:"https://pittsburghpanthers.com/sports/womens-soccer", est:325},
  {n:"Auburn", c:"SEC", r:21, u:"https://auburntigers.com/sports/womens-soccer", est:325},
  {n:"Tennessee", c:"SEC", r:22, u:"https://utsports.com/sports/womens-soccer", est:325},
  {n:"Wake Forest", c:"ACC", r:23, u:"https://godeacs.com/sports/womens-soccer", est:325},
  {n:"Iowa", c:"Big Ten", r:24, u:"https://hawkeyesports.com/sports/womens-soccer", est:325},
  {n:"Saint Mary's (CA)", c:"WCC", r:25, u:"https://smcgaels.com/sports/womens-soccer", est:295},
  {n:"Texas A&M", c:"SEC", r:26, u:"https://12thman.com/sports/womens-soccer", est:325},
  {n:"Clemson", c:"ACC", r:27, u:"https://clemsontigers.com/sports/womens-soccer", est:325},
  {n:"Washington", c:"Big Ten", r:28, u:"https://gohuskies.com/sports/womens-soccer", est:375},
  {n:"Vanderbilt", c:"SEC", r:29, u:"https://vucommodores.com/sports/womens-soccer", est:325},
  {n:"Louisville", c:"ACC", r:30, u:"https://gocards.com/sports/womens-soccer", est:325},
  {n:"Oregon", c:"Big Ten", r:31, u:"https://goducks.com/sports/womens-soccer", est:375},
  {n:"Rutgers", c:"Big Ten", r:32, u:"https://scarletknights.com/sports/womens-soccer", est:325},
  {n:"Virginia Tech", c:"ACC", r:33, u:"https://hokiesports.com/sports/womens-soccer", est:325},
  {n:"West Virginia", c:"Big 12", r:34, u:"https://wvusports.com/sports/womens-soccer", est:325},
  {n:"Minnesota", c:"Big Ten", r:35, u:"https://gophersports.com/sports/womens-soccer", est:325},
  {n:"Missouri", c:"SEC", r:36, u:"https://mutigers.com/sports/womens-soccer", est:325},
  {n:"LSU", c:"SEC", r:37, u:"https://lsusports.net/sports/womens-soccer", est:325},
  {n:"Kansas", c:"Big 12", r:38, u:"https://kuathletics.com/sports/womens-soccer", est:325},
  {n:"Ohio State", c:"Big Ten", r:39, u:"https://ohiostatebuckeyes.com/sports/womens-soccer", est:325},
  {n:"Nebraska", c:"Big Ten", r:40, u:"https://huskers.com/sports/womens-soccer", est:325},
  {n:"Illinois", c:"Big Ten", r:41, u:"https://fightingillini.com/sports/womens-soccer", est:325},
  {n:"Indiana", c:"Big Ten", r:42, u:"https://iuhoosiers.com/sports/womens-soccer", est:325},
  {n:"Wisconsin", c:"Big Ten", r:43, u:"https://uwbadgers.com/sports/womens-soccer", est:325},
  {n:"Northwestern", c:"Big Ten", r:44, u:"https://nusports.com/sports/womens-soccer", est:325},
  {n:"Maryland", c:"Big Ten", r:45, u:"https://umterps.com/sports/womens-soccer", est:325},
  {n:"Michigan State", c:"Big Ten", r:46, u:"https://msuspartans.com/sports/womens-soccer", est:325},
  {n:"Purdue", c:"Big Ten", r:47, u:"https://purduesports.com/sports/womens-soccer", est:325},
  {n:"Georgia", c:"SEC", r:48, u:"https://georgiadogs.com/sports/womens-soccer", est:325},
  {n:"Florida", c:"SEC", r:49, u:"https://floridagators.com/sports/womens-soccer", est:325},
  {n:"Kentucky", c:"SEC", r:50, u:"https://ukathletics.com/sports/womens-soccer", est:325},
  {n:"Alabama", c:"SEC", r:51, u:"https://rolltide.com/sports/womens-soccer", est:295},
  {n:"Ole Miss", c:"SEC", r:52, u:"https://olemisssports.com/sports/womens-soccer", est:295},
  {n:"Colorado", c:"Big 12", r:53, u:"https://cubuffs.com/sports/womens-soccer", est:295},
  {n:"Arizona", c:"Big 12", r:54, u:"https://arizonawildcats.com/sports/womens-soccer", est:295},
  {n:"Arizona State", c:"Big 12", r:55, u:"https://thesundevils.com/sports/womens-soccer", est:295},
  {n:"Utah", c:"Big 12", r:56, u:"https://utahutes.com/sports/womens-soccer", est:295},
  {n:"Iowa State", c:"Big 12", r:57, u:"https://cyclones.com/sports/womens-soccer", est:295},
  {n:"Kansas State", c:"Big 12", r:58, u:"https://kstatesports.com/sports/womens-soccer", est:295},
  {n:"Texas Tech", c:"Big 12", r:59, u:"https://texastech.com/sports/womens-soccer", est:295},
  {n:"Baylor", c:"Big 12", r:60, u:"https://baylorbears.com/sports/womens-soccer", est:295},
  {n:"NC State", c:"ACC", r:61, u:"https://gopack.com/sports/womens-soccer", est:295},
  {n:"Syracuse", c:"ACC", r:62, u:"https://cuse.com/sports/womens-soccer", est:295},
  {n:"Boston College", c:"ACC", r:63, u:"https://bceagles.com/sports/womens-soccer", est:295},
  {n:"Miami (FL)", c:"ACC", r:64, u:"https://hurricanesports.com/sports/womens-soccer", est:295},
  {n:"Georgia Tech", c:"ACC", r:65, u:"https://ramblinwreck.com/sports/womens-soccer", est:295},
  {n:"Cal", c:"ACC", r:66, u:"https://calbears.com/sports/womens-soccer", est:295},
  {n:"SMU", c:"ACC", r:67, u:"https://smumustangs.com/sports/womens-soccer", est:295},
  {n:"Villanova", c:"Big East", r:68, u:"https://villanova.com/sports/womens-soccer", est:295},
  {n:"UConn", c:"Big East", r:69, u:"https://uconnhuskies.com/sports/womens-soccer", est:295},
  {n:"Providence", c:"Big East", r:70, u:"https://friars.com/sports/womens-soccer", est:295},
  {n:"St. John's", c:"Big East", r:71, u:"https://redstormsports.com/sports/womens-soccer", est:295},
  {n:"Seton Hall", c:"Big East", r:72, u:"https://piratessports.net/sports/womens-soccer", est:295},
  {n:"Marquette", c:"Big East", r:73, u:"https://gomarquette.com/sports/womens-soccer", est:295},
  {n:"DePaul", c:"Big East", r:74, u:"https://depaulbluedemons.com/sports/womens-soccer", est:295},
  {n:"Butler", c:"Big East", r:75, u:"https://godawgs.com/sports/womens-soccer", est:295},
  {n:"Creighton", c:"Big East", r:76, u:"https://gocreighton.com/sports/womens-soccer", est:295},
  {n:"Xavier", c:"Big East", r:77, u:"https://goxavier.com/sports/womens-soccer", est:295},
  {n:"Gonzaga", c:"WCC", r:78, u:"https://gonzagabulldogs.com/sports/womens-soccer", est:295},
  {n:"San Diego", c:"WCC", r:79, u:"https://usdtoreros.com/sports/womens-soccer", est:295},
  {n:"Loyola Marymount", c:"WCC", r:80, u:"https://lmulions.com/sports/womens-soccer", est:295},
  {n:"Saint Mary's College", c:"WCC", r:81, u:"https://smcgaels.com/sports/womens-soccer", est:295},
  {n:"Pepperdine", c:"WCC", r:82, u:"https://pepperdinesports.com/sports/womens-soccer", est:295},
  {n:"Pacific", c:"WCC", r:83, u:"https://pacifictigers.com/sports/womens-soccer", est:295},
  {n:"Portland", c:"WCC", r:84, u:"https://portlandpilots.com/sports/womens-soccer", est:295},
  {n:"San Francisco", c:"WCC", r:85, u:"https://usfdons.com/sports/womens-soccer", est:295},
  {n:"Rice", c:"AAC", r:86, u:"https://riceowls.com/sports/womens-soccer", est:295},
  {n:"Tulsa", c:"AAC", r:87, u:"https://tulsahurricane.com/sports/womens-soccer", est:295},
  {n:"Memphis", c:"AAC", r:88, u:"https://gotigersgo.com/sports/womens-soccer", est:295},
  {n:"Cincinnati", c:"Big 12", r:89, u:"https://gobearcats.com/sports/womens-soccer", est:295},
  {n:"Houston", c:"Big 12", r:90, u:"https://uhcougars.com/sports/womens-soccer", est:295},
  {n:"Navy", c:"Patriot", r:91, u:"https://navysports.com/sports/womens-soccer", est:295},
  {n:"Army West Point", c:"Patriot", r:92, u:"https://goarmywestpoint.com/sports/womens-soccer", est:295},
  {n:"Air Force", c:"MW", r:93, u:"https://goairforcefalcons.com/sports/womens-soccer", est:295},
  {n:"Colorado State", c:"MW", r:94, u:"https://csurams.com/sports/womens-soccer", est:295},
  {n:"San Diego State", c:"MW", r:95, u:"https://goaztecs.com/sports/womens-soccer", est:295},
  {n:"UNLV", c:"MW", r:96, u:"https://unlvrebels.com/sports/womens-soccer", est:295},
  {n:"Nevada", c:"MW", r:97, u:"https://nevadawolfpack.com/sports/womens-soccer", est:295},
  {n:"Fresno State", c:"MW", r:98, u:"https://gobulldogs.com/sports/womens-soccer", est:295},
  {n:"Wyoming", c:"MW", r:99, u:"https://gowyo.com/sports/womens-soccer", est:295},
  {n:"New Mexico", c:"MW", r:100, u:"https://golobos.com/sports/womens-soccer", est:295}
]

console.log('🌱 Seeding recruiting camps...')

const { error } = await supabase.from('recruiting_camps').upsert(
  schools.map(s => ({
    school_name: s.n,
    conference: s.c,
    ranking: s.r,
    athletics_url: s.u,
    estimated_cost: s.est,
    is_top_100: true
  })),
  { onConflict: 'school_name' }
)

if (error) {
  console.error('Seed failed:', error)
  process.exit(1)
}

console.log(`✓ Seeded ${schools.length} schools into recruiting_camps`)