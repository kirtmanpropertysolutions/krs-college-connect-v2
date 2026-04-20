---
name: krs-product-spec
description: Visual design system and page-by-page product specification for KRS College Connect. Use this skill when building any UI page, writing copy, choosing colors, or deciding how a feature should behave. Covers both the athlete app and the club admin app.
---

# KRS College Connect Product Spec

This is the design and behavior spec for KRS College Connect — derived from the working v1 app. The rebuild should match this look and feel, not reinvent it.

## Visual identity

### Colors

The app uses a dark navy base with a crimson accent. These are the core tokens:

- **Background (deepest):** very dark navy, roughly `#0A1628` — the page background
- **Background (card):** slightly lighter navy with a subtle red border glow, roughly `#0F1E36` with a `rgba(220, 38, 38, 0.15)` border
- **Accent (primary action):** crimson red, roughly `#DC2626` to `#B91C1C` — used for primary buttons, active nav state, highlights, the club banner
- **Accent text:** same crimson for links, the word "Admin" next to KRS in admin header, active sidebar items
- **Text (primary):** off-white, roughly `#F9FAFB`
- **Text (muted):** muted gray, roughly `#94A3B8` — for labels, subheadings, placeholder text
- **Success green:** roughly `#10B981` — used for quiz progress bars, "Connect" buttons that succeed, fit percentage badges
- **Warning yellow:** roughly `#F59E0B` — used for the profile completion bar (71%), replied status dot
- **Info blue:** roughly `#3B82F6` — used for Hudl highlight reel section
- **Hot red:** same as accent — used for "Hot" kanban column
- **Purple:** roughly `#A855F7` — used for admin dashboard "Content Items" stat

### Club-specific theming

The Eastside FC crimson is the Eastside club color. In a multi-tenant setup, each club should be able to override the primary accent color. The default for now is crimson. Other elements (navy background, text, success green) stay the same across clubs.

### Typography

- **Headings:** use a bold condensed sans-serif display font for section titles and the big all-caps headers like "KAVID DIRTMAN", "SCHOOL FIT QUIZ", "NEXT ACTIONS". Something like **Oswald**, **Bebas Neue**, or **Barlow Condensed** in bold weight. All caps, wide letter spacing.
- **Body:** use a clean sans-serif like **Inter** or **system-ui** for everything else — form fields, body copy, buttons, tables.
- **Stat numbers:** the giant "0" stat card numbers use the display font, very large, bold.

### Logo and branding

- App logo: Eastside FC shield + mountains, white on crimson background, small square icon
- App name: "KRS College Connect" with subtitle "Recruiting Platform" (athlete view) or "KRS Admin" with the word Admin in red (admin view)
- In the athlete dashboard header, the club logo appears large next to the athlete's name in a crimson banner

### Layout patterns

**Athlete app (two-column):**
- Left sidebar: fixed 260px wide, dark background, contains logo, "RECRUITING" section (Dashboard, My Profile, School Fit Quiz, Coach Finder, My Schools, Outreach, Recruiting Events), "HIGHLIGHTS" section (Highlights, Video Editor), "NIL" section (NIL Deals), "SOCIAL" section (Social Planner), collapse arrow, athlete mini-card at bottom with avatar/name/class/Sign Out button
- Main content: fills the rest, padded generously, scrolls independently
- Active nav item: crimson background tint + crimson text + crimson left border

**Admin app (top-nav, no sidebar):**
- Horizontal top bar with KRS Admin logo on left, nav items in middle (Dashboard, Athletes, Invite Codes, Announcements, Content Library, Settings), admin name + Sign Out on right
- Main content area below, full width
- Active nav item: crimson background pill

**Cards:** rounded corners (roughly 12px radius), dark navy fill, subtle 1px border in `rgba(220,38,38,0.15)`, padding 24-32px. Stat cards have a crimson top border that glows slightly.

**Buttons:**
- Primary: solid crimson fill, white text, bold uppercase letters, roughly 16px font, 12px vertical padding, rounded corners
- Secondary: dark navy fill, crimson border, crimson text
- Ghost / Learn More: transparent, border, hover fills

**Forms:** dark navy inputs with subtle border, generous padding, white text inside, muted gray placeholder. Labels sit above the field in muted gray small caps.

**Progress bars:** rounded, colored fill (green for quiz, yellow for profile completion), thin (roughly 8px tall).

## Page-by-page spec

### Athlete: Dashboard (`/`)

**Purpose:** landing page after login. Shows snapshot of recruiting activity and nudges toward next action.

**Layout:**
1. Crimson banner at top with club logo + athlete name in big all-caps display font + subtitle "Goalkeeper · Class of 2031 · Eastside FC Washington"
2. Row of 5 stat cards across: Schools Targeted, Coach Outreach, Social Posts Pending, NIL Deals, Recruiting Events. Each shows a big number and a clickable arrow to drill in.
3. "NEXT ACTIONS" card — lists 2-3 suggested next steps with icons and an "Edit Profile" button per row. Examples: "Add a bio to your recruiting profile", "Add a highlight reel link".
4. Empty state placeholder (dashed border card) for additional content.
5. "GAME SCHEDULE" card with "+ Add Game" button. Empty state: "No upcoming games — Add your schedule so coaches know when to watch you play." Below that, "Sync with TeamSnap" integration card with a green Connect button.
6. On the right side: "Start your streak today!" card with flame icon, 0 Current / 0 Longest / 0 Total Days counters.
7. "PROFILE STRENGTH" card: circular progress ring showing percentage (25%), checklist of items (Highlight URL, GPA, Goals > 0, Bio) with check or empty circle. Bottom text in crimson: "Complete your profile to improve recruiting visibility."
8. "RECRUITING PIPELINE" section at the bottom — empty state "No schools in pipeline yet."

### Athlete: My Profile (`/profile`)

**Purpose:** single form page for athlete to complete their recruiting profile. This drives the Profile Completion score.

**Layout:**
1. "PROFILE COMPLETION" bar at top, yellow fill, percentage on right
2. "PERSONAL INFO" card: Full Name, Position (dropdown), Graduation Year, Club Team, High School, City/State, Jersey Number, Dominant Foot (dropdown), Height, Weight — two columns
3. "ACADEMIC INFO" card: GPA, SAT/ACT Score, Intended Major, Academic Interests, Honors/AP Classes
4. "SOCCER STATS (SEASON)" card: Goals, Assists, Minutes Played, Games Played, Clean Sheets, Shots on Goal, Pass Completion % — three columns of number inputs
5. "SOCIAL MEDIA" card with helper text "These links are auto-included in every email you send to coaches." Four rows with Instagram / X / TikTok / YouTube icons and URL inputs
6. "HIGHLIGHT REELS" card with helper text "Tip: Athletes with highlight reels get 3x more coach responses." Two larger cards: **Trace Profile URL** (orange camera icon, "The #1 video platform for club soccer. College coaches actively search Trace profiles.") and **Hudl Highlight Reel URL** (blue play icon, "Share your Hudl highlight reel directly with college coaches."). Below them: YouTube Highlights and Veo Link smaller inputs.
7. "BIO / RECRUITING STATEMENT" card with 500-character textarea, placeholder "Write a personal statement that coaches will read. Share your passion for soccer, your goals, and what makes you unique as a player…"
8. "PROFILE PHOTO" card at bottom (upload widget)

**Save:** implicit — fields save on blur/change. Show a subtle "saved" indicator.

### Athlete: School Fit Quiz (`/quiz`)

**Purpose:** 6-question quiz that matches athletes to schools in the database by fit percentage.

**Layout:**
- Header: "SCHOOL FIT QUIZ" + subtitle "Answer 6 quick questions and we'll match you to schools in our database."
- Progress bar with 6 segments — each turns green as answered, current segment is red, unanswered are dark
- "Question N of 6" counter
- Question card with title, subtitle (contextual hint like "Be honest — where you'll play matters more than the division name."), "SELECT ALL THAT APPLY" label in crimson, 3-4 large radio button options each with title and description
- Back / Next buttons at bottom (Next is crimson primary on right, Back is ghost on left)
- Last question's Next button says "See My Matches" instead

**The 6 questions (copy must match exactly):**
1. "What division level are you targeting?" — D1 (Highest competition, most scholarships, biggest time commitment) / D2 (Strong competition, partial scholarships, good balance) / D3 (No athletic scholarships, but great academics & playing time) / NAIA (Scholarships available, smaller schools, competitive soccer)
2. "Where do you want to go to school?" (Pick all regions you'd be happy in) — Pacific Northwest (WA, OR, ID, MT) / California (CA) / Southwest (AZ, UT, CO, NV) / Open to Anywhere (No geographic preference) — plus others the full app has
3. "What school size do you prefer?" — Small (Under 5,000 students — tight-knit, everyone knows you) / Medium (5,000–15,000 — balanced feel) / Large (15,000+ — big campus, tons of resources and social options)
4. "How important are academics in your decision?" (Be real — would you pick a weaker soccer program at a better school?) — Top Priority (I want the best school I can get into, soccer is secondary) / Very Important (Academics and soccer should both be strong) / Balanced (I want a solid school but soccer comes first) / Soccer First (The soccer program is what matters most to me)
5. "How important is immediate playing time?" (At a top program you may sit for 1-2 years. At a smaller program you could start day one.) — I Need to Start / I'll Compete for It / I'll Wait
6. "What kind of campus environment appeals to you?" (Where would you feel at home for 4 years?) — City / Urban / Suburban / Small Town / Rural / Faith-Based

### Athlete: School Fit Quiz Results (`/quiz/results`)

**Purpose:** shows schools ranked by fit percentage after quiz completion.

**Layout:**
- Header: "YOUR SCHOOL MATCHES" + subtitle "Based on your preferences, here are the schools that fit you best."
- Filter tags row showing quiz answers as pills: `division: D1`, `region: SW`, `size: large`, `academics: secondary`, `playingTime: develop`, `environment: faith` + a "Retake Quiz" button on the right
- "TOP MATCHES" section with school count badge
- Grid of school cards, 2 columns. Each card shows:
  - School logo square (uses school's real brand color as background)
  - School name, "Head Coach" label
  - Division badge (D1/D2/D3/NAIA), conference badge, state abbreviation
  - Fit percentage in big green text on the right, labeled "FIT"
  - Short descriptor line ("Perennial top-25, strong attacking style")
  - Crimson "Add to Pipeline" button

### Athlete: Coach Finder (`/coaches`)

**Purpose:** searchable directory of real college soccer coaches with tools to find contact info.

**Layout:**
- Header: "Coach Finder" + subtitle "122 college soccer coaches · Pacific Northwest focus" (number and region are dynamic)
- "HOW IT WORKS" card with three numbered steps: "Find a coach below or search online" / "Add to Pipeline to save their info" / "Email Coach with a ready-made template"
- "FIND REAL COACHES" search card with helper "Search for verified coach contact info from official sources" — School Name input + crimson Search button, plus "Coach Lookup Guide" link on the right
- "EMAIL PATTERN GENERATOR" card — First Name / Last Name / School Domain inputs. Helps athletes guess likely email addresses like sarah.mitchell@uw.edu
- "Add a Coach Manually" button
- Search bar + filter row: All/D1/D2/D3/NAIA toggle pills, then dropdowns for All Regions / All States / All Conferences / All Types
- "Showing N of M coaches" count
- Grid of coach cards (appear below — placeholder skeleton loaders shown when loading)

### Athlete: My Schools (`/schools`)

**Purpose:** kanban board of schools the athlete is pursuing, organized by outreach status.

**Layout:**
- Header: "MY SCHOOLS" + "Add School" crimson button on right
- Four columns: **TARGETING** (gray dot), **CONTACTED** (blue dot), **REPLIED** (yellow dot), **HOT** (red dot)
- Each column header shows the count on the right
- Empty state per column: "No schools here yet"
- Schools appear as draggable cards within columns
- A school must match the status constraint — allowed statuses are: `contacted`, `replied`, `interested`, `hot`, `committed`, `cold`. The UI groups `contacted`/`interested` into CONTACTED, `replied` into REPLIED, `hot` into HOT, and new adds go into TARGETING.

### Athlete: Outreach (`/outreach`)

**Purpose:** compose and track email outreach to coaches.

**Layout:**
- "Connect Gmail" card at top with "Set Up Gmail" button (OAuth) — "Send emails directly to coach draft folders from this platform"
- Two stat callouts: "Pipeline: 0 schools" and "Emails: 0 sent"
- Three-column layout:
  - **Left:** "PICK A COACH" card with search box, shows coaches from user's pipeline. Empty state: "No coaches in pipeline yet — Go to Coach Finder to add coaches first."
  - **Middle:** "Compose an Email" large card with instructions — "Select a coach from the list on the left, pick a template on the right, then review and send." Numbered steps: 1. Pick a coach from your pipeline / 2. Choose a template to auto-fill / 3. Review & send or save as draft
  - **Right:** "TEMPLATES" card with 4 template options each in its own row: "Initial Outreach — Best for first contact with a new…", "Follow-Up — Send 2 weeks after your first email", "Highlight Reel Share — Great after adding new highlight…", "Campus Visit Request — When a coach has shown interest"
- "OUTREACH HISTORY" section at bottom showing "0 total", empty state: "No emails sent yet. Pick a coach and template above to get started."

### Athlete: Recruiting Events (`/events`)

**Purpose:** calendar of real ID camps, showcases, tournaments, and prospect days.

**Layout:**
- Header: "RECRUITING EVENTS" + subtitle "Discover ID camps, showcases, tournaments, and prospect days for college soccer recruiting."
- 4 stat cards: Events Saved (0), Registered (0), Upcoming 30 Days (0), Total Cost ($0)
- "RECOMMENDED FOR [NAME]" highlighted card with personalized text based on athlete's profile (e.g., "Based on Kavid's profile (Goalkeeper · Class of 2031 · MI, WA) we recommend prioritizing ECNL events, Pacific Northwest D1 ID camps, and national showcases. D1 coaches for the Class of 2031 will begin serious evaluation soon.")
- Filter bar: search events / All Types / All Regions / All Divisions / All Costs / Within 500mi of Seattle
- Time range pills: "Next 30 Days (4)" / "Next 3 Months (21)" / "Next 6 Months (24)" — with the active one filled crimson
- Grid of event cards, 2 columns. Each card shows:
  - Event type badge (Prospect Day, ID Camp, Showcase, Tournament) + Division badge (D1/D2/D3)
  - Event name in large display font, school name, location, date, countdown ("6d away")
  - Cost badge (Free / $N)
  - Graduation year tags that match athlete's class (highlighted) and don't match (dimmed) — e.g., `2029 2030 **2031**`
  - Description paragraph
  - "Coaches: [school name]" attribution
  - Registration deadline in yellow ("Reg. deadline: April 20, 2026 (1d left)") or red ("Reg. deadline: April 15, 2026 (Past)")
  - "Save Event" crimson button + "Learn More" ghost button

### Athlete: Highlights (`/highlights`)

**Purpose:** connect external highlight platforms + manage clip library.

**Layout:**
- Tab bar at top: "HIGHLIGHTS" (active, crimson underline) | "NIL DEALS"
- "CONNECT YOUR HIGHLIGHTS" header
- Two large cards side by side:
  - **Trace Highlights** (orange icon): "The #1 video platform for club soccer. College coaches love Trace." + URL input + "Connect" button (orange/amber)
  - **Hudl Highlights** (blue icon): "Share your Hudl highlight reel directly with college coaches." + URL input + Connect button (blue)
- Info banner: "College coaches at D1 programs watch an average of 3-5 highlight clips before making contact. Having your Trace and Hudl links ready makes it easy for coaches to find you."
- "CLIP LIBRARY" header + "+ Add Clip" crimson button on right
- Empty state: centered club logo faded + "No highlight clips yet — Add your first highlight reel"

### Athlete: Video Editor (`/editor`)

**Purpose:** lightweight in-browser editor for trimming clips, adding overlays, exporting branded highlight reels.

**Layout:** three-column
- **Left:** "Clips" panel. Drop zone at top ("Drop clip here or click to upload", dashed border). Below: list of existing clips each showing thumbnail, name, duration, status badge (draft/exported)
- **Center:** large preview area with club logo shield watermark. Below preview: "Select a clip to start editing" placeholder
- **Right:** tool panel with tabs: "Trim" (active) / "Overlays" / "Export". Under Trim tab: "Select a clip first" empty state

### Athlete: NIL Deals (`/nil`)

**Purpose:** NIL education + value-building tools. This is the NIL DEALS tab from the Highlights nav.

**Layout:**
- Same tab bar as Highlights: "HIGHLIGHTS" | "NIL DEALS" (active)
- "YOUR NIL JOURNEY" header + subtitle "Name, Image and Likeness — understand it, build your value, and be ready when opportunities arrive."
- "NIL READINESS SCORE" bar: 0% fill with "0 of 9 items complete" below
- "WHAT IS NIL?" section with 4 expandable accordion rows: "What is NIL?", "Washington State HS NIL Rules", "When Does It Get Real?", "What Should I Do Now?"
- "BUILD YOUR VALUE" section
- "SOCIAL FOLLOWING TRACKER" card: 4 number inputs (Instagram, TikTok, YouTube, X (Twitter)), Total count below, Est. Post Value calculated from total

### Athlete: Social Planner (`/social`)

**Purpose:** weekly content calendar for Instagram / X / TikTok / YouTube.

**Layout:**
- Header: "SOCIAL PLANNER" + Week/Month toggle + date navigation arrows + date range display ("Apr 13, 2026 – Apr 19, 2026")
- Platform filter pills: All / Instagram / X / TikTok / YouTube (current platform highlighted crimson)
- Weekly calendar grid: 7 day columns (MON-SUN) with date, each has "+ Add" button. Today's column highlighted crimson
- "COMPOSE POST" card below calendar: platform sub-tabs (Instagram active) / Date picker / Time picker / Content textarea with char counter ("Instagram · 2,200 char limit" + "2,200 remaining") / "Schedule Post" crimson button
- "TEMPLATES" panel on the right, scrollable list grouped by platform. Each template is a card with preview text. Examples:
  - Instagram: "Match Day: 0G 0A today! Putting in the work. #EastsideFC #ClassOf2031 #SoccerRecruiting"
  - X: "Game day stats: 0G | 0A | 0 min. Let's go @EastsideFC! #ClassOf2031"
- Template text auto-fills based on athlete's stats (goals, assists, minutes)

### Admin: Dashboard (`/admin`)

**Purpose:** club admin command center. Shows club-wide stats and quick actions.

**Layout:**
- Top nav bar (not sidebar): KRS Admin logo + nav items (Dashboard / Athletes / Invite Codes / Announcements / Content Library / Settings) + admin name + Sign Out
- Crimson banner across top with club logo + big all-caps club name "EASTSIDE FC WASHINGTON" + subtitle "Club Admin Command Center"
- **⚠️ Current app shows a red error banner here: "Forbidden use of secret API key in browser." This is the service role key exposure bug we're fixing in rebuild. The rebuild must NOT show this — admin data should load from server-side API routes.**
- Row of 4 stat cards: Total Athletes (0, white number), Active This Week (0, green), Announcements Sent (0, blue), Content Items (0, purple)
- Three quick-action buttons: "Send Announcement" / "Upload Content" / "View All Athletes"
- "ATHLETE ACTIVITY" table with columns: Athlete / Position / Class / Last Active / Profile / Schools / Emails
- "RECENT ANNOUNCEMENTS" section, empty state: "No announcements yet. Send one now."

### Admin: Athletes (`/admin/athletes`)

**Purpose:** list and manage all athletes in the club.

**Layout:**
- Header: "Athletes (N)" count + "EXPORT CSV" button on right
- Search "Search name or email…" + "All Years" dropdown + "All Positions" dropdown
- Table: Athlete / Position / Class / GPA / Profile / Schools / Emails / Status / Actions
- Empty state: "No athletes match your filters."
- Row actions should include: view profile, send reset password email, deactivate, delete. **Delete and deactivate are permission-critical and must go through a server-side API route — never from the browser.**

### Admin: Invite Codes (`/admin/invites`)

**Purpose:** create and manage invite codes athletes use to sign up.

**Layout:**
- Header: "Invite Codes"
- "CREATE NEW CODE" card: Code input (with Random button to auto-generate) / Label (optional, e.g. "Spring 2026") / Max Uses (default 50) / Create button
- "ALL CODES (N)" list below. Each code shows the code, label, uses/max, created date, status (active/expired), and actions (copy, deactivate, delete)
- Empty state: "No invite codes yet. Create one above."

### Admin: Announcements (`/admin/announcements`)

**Purpose:** broadcast messages to athletes.

**Layout:**
- Header: "Announcements"
- "COMPOSE ANNOUNCEMENT" card:
  - Title input (placeholder "Weekly Update")
  - Message textarea (placeholder "Write your announcement…")
  - Audience dropdown (All Athletes / by class year / by position)
  - Priority dropdown (Low / Normal / High / Urgent)
  - Schedule dropdown (Send Now / Schedule for later — reveals date/time picker)
  - "SEND ANNOUNCEMENT" crimson button + "PREVIEW" ghost button
- "ANNOUNCEMENT HISTORY (N)" section, empty state: "No announcements yet."
- Each historical announcement shows title, preview, audience, sent date, read count

### Admin: Content Library (`/admin/content`)

**Purpose:** upload reusable content (images, templates, video snippets) athletes can pull into their social and outreach.

**Layout:**
- Header: "Content Library"
- "UPLOAD CONTENT" card:
  - Title (e.g. "Game Day Post")
  - Type dropdown (Image / Video / Template / Graphic)
  - Platform dropdown (All / Instagram / X / TikTok / YouTube)
  - Description (short)
  - Content Text textarea (caption / hashtags / template text) with placeholder "Paste caption or template text…"
  - Image/File URL input
  - Tags input (comma separated, e.g. "gameday, recruiting, social")
  - Crimson "UPLOAD CONTENT" button
- Library grid below, empty state: "No content uploaded yet."

### Admin: Settings (`/admin/settings`)

**Purpose:** club-level configuration.

**Layout:**
- Header: "Settings"
- "CLUB INFORMATION" card: Club Name input / Admin Email(s) textarea (one per line, helper text: "These accounts get admin access.")
- "SEASON DATES" card: Season Start / Season End date pickers
- "NOTIFICATION PREFERENCES" card with checkboxes:
  - Email me when a new athlete joins (checked by default)
  - Weekly athlete activity summary (checked by default)
  - Alert when athlete goes inactive for 7+ days (unchecked by default)
- "SAVE SETTINGS" crimson button

## Copy rules

- Use lowercase, plain language everywhere. "My Schools" not "Pipeline Management". "Coach Finder" not "Directory of NCAA Coaching Personnel".
- Every button label is a verb: "Add School", "Save Event", "Send Announcement", "Connect", "Retake Quiz".
- Empty states are short and direct: "No schools here yet", "No announcements yet. Send one now." They tell the user what to do next in fewer than 10 words.
- Error messages are plain. "Forbidden use of secret API key in browser" is the kind of string that should never reach a user — server-side issues should be logged and the user should see "Something went wrong — please refresh or contact support."
- Never use "utilize", "leverage", "facilitate". Use "use", "help", "do".
- Never use emoji except in sparingly-chosen places like the streak flame. The current app doesn't use emoji and neither should the rebuild.

## Live data dependencies (CRITICAL)

The v1 app is not running on mock data. The rebuild must account for these real-world data sources from day one — they are not optional polish.

### 1. Recruiting Events calendar
- Real events: BYU Women's Soccer Prospect Day, Santa Clara Women's Soccer Prospect Day, etc.
- Each event has: name, school, location, date, registration deadline, cost, type (prospect day / ID camp / showcase / tournament), division, graduation years targeted, description, coach attribution
- **Source:** needs a curated database that gets updated. Options: scrape college athletic department pages, import from a third-party like SportsRecruits or NCSA, or hand-maintained with admin tooling.
- The "RECOMMENDED FOR [NAME]" callout is personalized based on athlete's profile (class year + position + region) — needs a matching algorithm.

### 2. Real coaches directory
- 122 coaches in v1 with verified contact info ("122 college soccer coaches · Pacific Northwest focus")
- Each coach has: name, title, school, conference, division, email, phone, school domain
- "Find Real Coaches" search hits verified official sources
- "Email Pattern Generator" takes first + last + school domain and outputs common email patterns (firstname.lastname@, firstinitial lastname@, firstname@, etc.)
- **Source:** initial seed from manual scraping of athletic department staff pages. Maintain with admin tooling. Email verification via something like Hunter.io optional.

### 3. Schools database with colors and branding
- School Fit Quiz results show school logo squares with the school's actual brand color as background (BYU dark blue, Utah red, Arizona Wildcats navy/red, Air Force blue, etc.)
- Each school has: name, logo, primary brand color, division, conference, state, enrollment size, academic rank, soccer program strength, geographic region
- **Source:** seed from NCAA + NAIA public directories. Hex colors from each school's brand guidelines or a service like sportslogos.net. Store in a `schools` table in Supabase.

### 4. NCAA/NAIA structure
- Divisions: D1, D2, D3, NAIA, Junior College
- Conferences: Pac-12 (now dissolved as of 2024 — needs update), Big 12, WCC, Big Sky, Mountain West, NESCAC, etc. — conference memberships change, so this data needs refresh
- Regions: Pacific Northwest, California, Southwest, Midwest, Northeast, Southeast, Mid-Atlantic, Mountain West
- **Source:** NCAA public data, refreshed seasonally

### 5. Outreach email templates
- 4 templates in the current app (Initial Outreach, Follow-Up, Highlight Reel Share, Campus Visit Request)
- Templates use mergeable variables: {{athlete_name}}, {{coach_name}}, {{school_name}}, {{position}}, {{grad_year}}, {{highlight_url}}, {{trace_url}}, {{hudl_url}}, {{social_handles}}
- **Source:** seed templates in code, club admins can add club-specific templates via Content Library

### 6. Social Planner post templates
- Templates are stat-aware and fill in athlete's current numbers (goals, assists, minutes)
- Examples in the v1 app include "Match Day" posts, "Training" posts, "Film session" posts, "Team shoutout" posts
- **Source:** seed templates in code

### 7. Gmail integration
- "Connect Gmail" / "Set Up Gmail" button triggers OAuth
- Once connected, outreach emails land in the athlete's Gmail drafts folder (not sent directly — athlete reviews and sends)
- **Source:** Google OAuth + Gmail API. Requires Google Cloud project, OAuth consent screen, and handling refresh tokens server-side.

### 8. TeamSnap integration (Coming Soon)
- "Sync with TeamSnap" connects to athlete's club team schedule
- Auto-imports upcoming games so they populate the Game Schedule dashboard card
- **Source:** TeamSnap API

### 9. Trace / Hudl / Veo link embedding
- Paste URL to connect — pulls latest highlight thumbnail and metadata
- **Source:** these platforms don't have public APIs for scraping — store URL and show as iframe embed or link-out

## What the rebuild must NOT do

- Do not hardcode athlete names, school lists, or any seed data in the UI code. Everything comes from the database.
- Do not use the service role key in browser code under any circumstances (this is what the current admin dashboard shows broken).
- Do not reintroduce "targeting" as a pipeline status — allowed statuses are contacted / replied / interested / hot / committed / cold. The UI label "TARGETING" maps to "contacted" in the DB (see krs-supabase-schema).
- Do not use emoji except the intentional streak flame.
- Do not add glassmorphism, neon gradients, Vercel branding, or any visual cliché that screams "AI-generated SaaS template".
- Do not add dashboard features that aren't in this spec without asking Chanyn first. Scope creep is how v1 got into its current tangled state.

## Mobile considerations

The v1 app was not mobile-polished. The rebuild should be mobile-first for the athlete app (most athletes will use their phones), and desktop-first for the admin app (coaches and club admins will be at a computer).

Mobile athlete app:
- Sidebar collapses to a hamburger menu
- Dashboard stat cards stack vertically
- Profile form inputs go to full width
- Quiz options stack vertically with larger tap targets
- My Schools kanban becomes a swipeable tab (Targeting / Contacted / Replied / Hot), one column at a time
- Coach cards and event cards single-column
- Social Planner weekly view becomes a day-by-day vertical scroll

## Testing checklist

Before shipping any page in the rebuild, verify:
- Works on hard refresh (Cmd+Shift+R) — this was a blocker in v1
- Loads with no console errors
- Sign out works from both normal nav and hard refresh
- Admin pages use server-side routes for any mutation — no service role key in browser
- Profile completion percentage updates correctly when fields change
- Quiz answers persist across page navigation and survive hard refresh
- Kanban status changes write the correct allowed status value to the DB
- Copy buttons appear on all copyable content (prompts, credentials, generated emails)
- No placeholder names like "John Doe" anywhere in the UI
- Empty states are present and helpful on every page

## Summary

The athlete app is a single-purpose recruiting dashboard for a high school soccer player — plain language, dark navy theme with crimson accents, sidebar nav, one main card per section, generous whitespace. The admin app is a command center for the club — top nav, stat cards, data tables, form-heavy configuration. Both apps share the same visual vocabulary but different navigation patterns. Real data (events, coaches, schools) drives everything — no mock data in the rebuild.
