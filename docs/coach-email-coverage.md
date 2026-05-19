# Women's Soccer Coach / Program Email Coverage

Operational doc for the women's soccer program email coverage workflow.
Source of truth is the production `schools` table.

## Current coverage snapshot

As of 2026-05-19 (post manual fill batch):

| Division | Total | Covered | % |
|---|---|---|---|
| D1   | 296 | 164 | 55% |
| D2   |  39 | ~20 | ~50% |
| D3   |  29 |  11 | 38% |
| NAIA |  27 |   0 | 0% |
| **Total** | **391** | **197** | **50.4%** |

The 27 NAIA rows are all missing `athletics_website` — none of them can be
scraped until that column is backfilled. They are also less critical than D1/D2
for most athletes, so triage them last.

## Schema (`schools` table)

Columns added by migration `051_program_email_coverage.sql` (applied to production):

| Column | Notes |
|---|---|
| `program_email` | The winning outreach email. Set by manual fill OR future scraper. |
| `program_email_source` | One of `coach_page`, `staff_directory`, `coach_bio`, `recruiting_questionnaire`, `athletics_contact`, `manual`, `unknown`. |
| `program_email_confidence` | `verified` (extracted from a coach page mailto), `likely` (pattern-generated), or `missing`. |
| `program_email_url` | The athletics-site URL the email was pulled from. |
| `program_email_last_checked_at` | When the scraper / manual fill last touched this row. |
| `program_email_failure_reason` | Set only when `confidence = 'missing'`. Examples: `no_athletics_website`, `cloudflare_blocked`, `school_closed_2023`, `athletics_suspended_2020`, `no_womens_soccer_program`. |
| `program_email_candidates` | JSONB array of all candidate emails the scraper found in its most recent pass (head coach, recruiting, etc.) — preserved for admin triage. |

## Two scripts

- **`scripts/scrape-coaches.js`** — 5-tier waterfall scraper (coach page →
  staff directory → coach bio → recruiting questionnaire → program contact
  fallback) with Sidearm/PrestoSports/custom platform detection, retry/backoff,
  and Cloudflare detection. Idempotent. Useful flags:

      node scripts/scrape-coaches.js --dry-run --limit=5
      node scripts/scrape-coaches.js --missing-emails
      node scripts/scrape-coaches.js --division=D2
      node scripts/scrape-coaches.js --school="Stanford"

  Not yet run end-to-end against production. Treat as future infrastructure.

- **`scripts/export-program-email-coverage.mjs`** — generates a CSV in /tmp
  for admin triage. Columns include current email, confidence, source URL,
  failure reason, and a `needs_manual_review` flag.

## How to fill remaining missing schools (fastest manual workflow)

1. Identify candidates:

       SELECT id, name, division, conference, athletics_website
       FROM public.schools
       WHERE (program_email IS NULL OR program_email = '')
         AND (program_email_failure_reason IS NULL
              OR program_email_failure_reason = '')
       ORDER BY division, name;

2. For each row, in a browser tab, go to the school's athletics
   `/sports/womens-soccer/coaches` page. If 404, try `/sports/wsoc/coaches`
   or Google "<school> women's soccer head coach email".

3. Batch-update via single SQL statement (preferred — many rows at once):

       UPDATE public.schools AS s
       SET program_email = v.email,
           program_email_source = 'manual',
           program_email_confidence = 'verified',
           program_email_url = v.src,
           program_email_last_checked_at = now()
       FROM (VALUES
         ('<uuid>'::uuid, 'coach@school.edu', 'https://athletics.school.edu/...')
       ) AS v(id, email, src)
       WHERE s.id = v.id;

## Known data-quality issues (caught during the manual fill batch)

- 7 D1 schools had wrong `athletics_website` values in the DB (since fixed):
  Stonehill, IU Indianapolis, Monmouth, SE Missouri State (the old URL was
  redirecting to a gambling site), Cal State LA, Wake Forest, Weber State.
- 2 closed schools still in the DB: Holy Names University (closed 2023) and
  Notre Dame de Namur University (athletics suspended 2020). Both marked
  with `program_email_failure_reason`.
- 1 school in the DB with no women's soccer program: University of Alaska
  Anchorage. Marked with `program_email_failure_reason = 'no_womens_soccer_program'`.
- Cal State LA is listed as D1 in the DB but plays in CCAA which is a D2
  conference. Likely a seed error.
- Cal State East Bay and Cal State San Bernardino each have multiple "Head
  Coach" names appearing in Google results — need human eyeball on the
  live athletics page before writing an email.

## What the scraper rewrite does NOT yet do

- Has never been run end-to-end against real production data. Code review
  passed, but first contact with athletics sites will surface bugs that
  need iteration.
- Doesn't yet bypass Cloudflare — only detects and marks
  `failure_reason = 'cloudflare_blocked'`. Bypass would require a headless
  browser or proxy.
- Doesn't handle athletics sites whose coach emails only render in
  JavaScript (some newer Sidearm v2 instances). Detected but not
  extracted; marked as `javascript_rendered`.
- Pattern-generated `likely` emails default to `first.last@domain`. Some
  schools use `flast@` or `first_last@`. Audit after the first real run.
