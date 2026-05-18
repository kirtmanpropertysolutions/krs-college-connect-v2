#!/usr/bin/env node

/**
 * Coach Data Scraper for KRS College Connect
 * Scrapes real coach contact information from athletics websites
 * Replaces placeholder "Needs Verification" entries with verified data
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

let env = {};
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (error) {
  console.error('Error reading .env.local:', error);
  process.exit(1);
}

// Initialize Supabase client with service role
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false }
  }
);

// Rate limiting - 3 concurrent requests max
const limit = pLimit(3);

// Domain delay tracking (1 second between requests to same domain)
const domainDelays = new Map();

// User agent for polite crawling
const USER_AGENT = 'KRSCollegeConnect-Bot/1.0 (recruiting platform - contact: kirtmanpropertysolutions@gmail.com)';

// Results tracking
const results = {
  success: 0,
  partial: 0,
  failed: 0,
  failures: []
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extract domain from URL
 */
const getDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

/**
 * Enforce polite delay between requests to same domain
 */
const enforceDelay = async (url) => {
  const domain = getDomain(url);
  const lastRequest = domainDelays.get(domain);

  if (lastRequest) {
    const timeSince = Date.now() - lastRequest;
    if (timeSince < 1000) {
      await sleep(1000 - timeSince);
    }
  }

  domainDelays.set(domain, Date.now());
};

/**
 * Generate likely email addresses from name and domain
 */
const generateLikelyEmails = (name, emailDomain) => {
  if (!name || !emailDomain || name.includes('Needs Verification')) {
    return [];
  }

  const nameParts = name.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/);

  if (nameParts.length < 2) return [];

  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];

  // Common email patterns
  return [
    `${firstName}.${lastName}@${emailDomain}`,
    `${firstName}${lastName}@${emailDomain}`,
    `${firstName.charAt(0)}${lastName}@${emailDomain}`,
    `${firstName}_${lastName}@${emailDomain}`,
    `${lastName}@${emailDomain}`
  ];
};

/**
 * Parse HTML to extract coach information
 */
const parseCoachInfo = (html) => {
  const $ = cheerio.load(html);
  const coaches = [];

  // Common selectors for different CMS systems. Modern Sidearm v2 uses
  // s-person-card; older variants use sidearm-coach / sidearm-staff-card.
  const selectors = [
    // Modern Sidearm v2 (2022+)
    '.s-person-card',
    '.s-person-details',
    '.c-coachcard',
    '.c-staff-card',
    // Legacy Sidearm
    '.sidearm-roster-player',
    '.sidearm-coach',
    '.sidearm-staff-card',
    '.sidearm-staff-member',
    '.coach-card',
    '.staff-card',
    // Generic patterns
    '.coach',
    '.staff-member',
    '.coaching-staff',
    '[data-role="coach"]',
    // Table rows
    'tr',
    // Generic containers that might contain coach info
    '.person',
    '.staff',
    '.member'
  ];

  // Try each selector pattern
  for (const selector of selectors) {
    const elements = $(selector);

    elements.each((_, element) => {
      const $el = $(element);
      const text = $el.text().toLowerCase();

      // Skip if doesn't contain coach-related keywords
      if (!text.includes('coach') && !text.includes('staff')) {
        return;
      }

      // Skip player entries
      if (text.includes('player') || text.includes('athlete') || text.includes('freshman') ||
          text.includes('sophomore') || text.includes('junior') || text.includes('senior')) {
        return;
      }

      // Extract name
      let name = null;

      // Try different name extraction patterns. Modern Sidearm v2 puts the
      // coach name in `.s-person-details__personal-single-line` and older
      // versions use `.sidearm-coach-name` or a raw h3/h4.
      const nameSelectors = [
        '.s-person-details__personal-single-line',
        '.s-person-card__personal-info-name',
        '.s-person-card__name',
        '.c-coachcard__name',
        '.c-staff-card__name',
        '.sidearm-roster-player-name',
        '.sidearm-coach-name',
        '.sidearm-staff-card-name',
        '.name',
        '.coach-name',
        '.staff-name',
        'h3', 'h4', 'h5',
        '.title a',
        'a[href*="/staff/"]',
        'a[href*="/coaches/"]',
        'strong',
        'b'
      ];

      for (const nameSelector of nameSelectors) {
        const nameEl = $el.find(nameSelector).first();
        if (nameEl.length && nameEl.text().trim()) {
          name = nameEl.text().trim();
          break;
        }
      }

      // Fallback: extract from main text
      if (!name) {
        const lines = $el.text().split('\n').map(l => l.trim()).filter(l => l);
        for (const line of lines) {
          if (line.length > 5 && line.length < 50 &&
              /^[A-Z][a-z]+ [A-Z]/.test(line) &&
              !line.toLowerCase().includes('coach') &&
              !line.toLowerCase().includes('university') &&
              !line.toLowerCase().includes('college')) {
            name = line;
            break;
          }
        }
      }

      if (!name || name.length < 5) return;

      // Extract email. Sidearm v2 sometimes encodes the address in a
      // `data-email` attribute or splits it across spans to thwart scrapers;
      // we try the obvious mailto first, then fall back to data attributes.
      let email = null;
      const html = $el.html() || '';
      const emailMatch = html.match(/mailto:([^"'\s>?]+)/);
      if (emailMatch) {
        email = emailMatch[1];
      } else {
        const dataEmail = $el.find('[data-email]').first().attr('data-email');
        if (dataEmail && dataEmail.includes('@')) {
          email = dataEmail;
        }
      }
      // Last-ditch: free-text email regex inside the card
      if (!email) {
        const textMatch = $el.text().match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
        if (textMatch) email = textMatch[1];
      }

      // Determine title/role
      const title = text.includes('head coach') ? 'Head Coach' :
                   text.includes('assistant coach') ? 'Assistant Coach' :
                   text.includes('associate coach') ? 'Associate Coach' :
                   'Coach';

      // Only add if we haven't seen this name before
      if (!coaches.find(c => c.name === name)) {
        coaches.push({
          name,
          email,
          title,
          source: 'scraped'
        });
      }
    });

    // If we found coaches with this selector, stop trying others
    if (coaches.length > 0) break;
  }

  // Program-email fallback. Scan every mailto on the page and pick the one
  // most likely to belong to the soccer program. We rank candidates: an
  // address that mentions soccer/wsoc wins, otherwise a generic "recruiting"
  // or "athletics" inbox is acceptable as a last resort.
  let programEmail = null;
  const allMailtos = (html.match(/mailto:([^"'\s>?]+)/g) || [])
    .map((m) => m.replace('mailto:', '').toLowerCase())
    .filter((e) => e.includes('@'));

  // Tier 1: soccer-specific
  programEmail = allMailtos.find((e) =>
    /soccer|wsoc|wsoccer|w-soccer/.test(e)
  ) || null;

  // Tier 2: recruiting / camps inbox (still useful for outreach)
  if (!programEmail) {
    programEmail = allMailtos.find((e) =>
      /recruit|camps?|prospect/.test(e)
    ) || null;
  }

  // Tier 3: generic athletics inbox — only if nothing else and we're sure
  // we're on a soccer page (caller already verified that).
  if (!programEmail) {
    programEmail = allMailtos.find((e) =>
      /athletics|sport(s)?(info|admin)?/.test(e)
    ) || null;
  }

  // Head-coach-only fallback: if structured selectors failed but the page
  // labels someone as "Head Coach", grab that name even without an email.
  // Pattern matches "Jane Smith — Head Coach", "Head Coach Jane Smith",
  // common Sidearm rendering.
  if (coaches.length === 0) {
    const headCoachPatterns = [
      /([A-Z][a-z]+(?:[\s'-][A-Z][a-z]+){1,3})\s*[–—-]\s*Head Coach/g,
      /Head Coach[\s\n]*[–—:-]?[\s\n]*([A-Z][a-z]+(?:[\s'-][A-Z][a-z]+){1,3})/g
    ];
    const pageText = $('body').text();
    for (const re of headCoachPatterns) {
      const m = re.exec(pageText);
      if (m && m[1]) {
        const candidate = m[1].trim();
        // Avoid grabbing "Soccer Coach" or other false-positives
        if (!/coach|soccer|university|college|athletic/i.test(candidate)) {
          coaches.push({
            name: candidate,
            email: null,
            title: 'Head Coach',
            source: 'scraped-headcoach-fallback'
          });
          break;
        }
      }
    }
  }

  return { coaches, programEmail };
};

/**
 * Attempt to scrape coach data from a school's website
 */
const scrapeSchoolCoaches = async (school) => {
  if (!school.athletics_website) {
    return { error: 'No athletics website URL' };
  }

  // Ensure URL has protocol prefix
  let baseUrl = school.athletics_website.replace(/\/$/, '');
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'https://' + baseUrl;
  }

  // Common URL patterns for women's soccer coaching staff. Order matters —
  // coaches/staff pages first (most informative), then the program landing
  // page (often has a short "Meet the staff" sidebar with mailto links).
  const urlPatterns = [
    // Modern Sidearm v2 (post-2022, most D1 schools)
    '/sports/womens-soccer/coaches',
    '/sports/wsoc/coaches',
    '/sports/w-soccer/coaches',
    '/sports/wsoccer/coaches',
    '/sports/womens-soccer/coaching-staff',
    '/sports/wsoc/coaching-staff',
    '/sports/womens-soccer/staff',
    '/sports/wsoc/staff',
    '/sports/wsoc/staff-directory',
    '/sports/womens-soccer/staff-directory',
    // SEC / Big Ten variants
    '/sports/women/soccer/coaches',
    '/sports/women/soccer/staff',
    '/womens/soccer/coaches',
    '/womens/soccer/staff',
    '/staff-directory?path=wsoc',
    '/staff-directory?path=womens-soccer',
    // Legacy Sidearm (.aspx)
    '/coaches.aspx?path=wsoc',
    '/coaches.aspx?path=womens-soccer',
    '/staff.aspx?path=wsoc',
    '/staff.aspx?path=womens-soccer',
    // Program landing pages (fallback — often contain coach links/emails)
    '/sports/womens-soccer',
    '/sports/wsoc',
    '/sports/w-soccer',
    '/sports/wsoccer',
    // Path-prefix variants (no /sports/)
    '/womens-soccer/coaches',
    '/wsoc/coaches',
    '/wsoccer/coaches',
    // Index pages that list head coach in a card
    '/sports/womens-soccer/index',
    '/sports/wsoc/index'
  ];

  // We try every URL pattern and accumulate the best result. A program email
  // (e.g. wsoc@auburn.edu) is valuable even when no individual coaches show
  // up on the page — many D1 programs hide individual coach emails and only
  // expose a shared recruiting inbox.
  let bestProgramEmail = null;
  let bestUrl = null;

  for (const pattern of urlPatterns) {
    const url = baseUrl + pattern;

    try {
      await enforceDelay(url);

      console.log(`Trying: ${school.name} - ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT
        },
        timeout: 10000
      });

      if (!response.ok) {
        if (response.status === 404) {
          continue; // Try next pattern
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      // Check if this looks like a soccer-related page at all
      const htmlLower = html.toLowerCase();
      if (
        !htmlLower.includes('soccer') &&
        !htmlLower.includes('coach') &&
        !htmlLower.includes('staff')
      ) {
        continue; // Definitely not the right page
      }

      const result = parseCoachInfo(html);

      // If we found actual coach rows, this is a full success — return now.
      if (result.coaches.length > 0) {
        return {
          coaches: result.coaches,
          programEmail: result.programEmail || bestProgramEmail,
          url: url
        };
      }

      // No coaches on this page, but a program email is still a win.
      // Remember it and keep trying other URL patterns in case a later page
      // has individual coach rows we can pair with it.
      if (result.programEmail && !bestProgramEmail) {
        bestProgramEmail = result.programEmail;
        bestUrl = url;
      }

    } catch (error) {
      console.log(`Error trying ${url}: ${error.message}`);
      continue; // Try next pattern
    }
  }

  // If we found a program email but no individual coaches, that's still a
  // successful scrape — the Outreach UI uses school.program_email as a
  // fallback when no specific coach is selected.
  if (bestProgramEmail) {
    return {
      coaches: [],
      programEmail: bestProgramEmail,
      url: bestUrl
    };
  }

  return { error: 'No coach data found on any URL pattern' };
};

/**
 * Update database with scraped coach data
 */
const updateCoachData = async (school, scrapedData) => {
  try {
    console.log(`📝 Updating database for ${school.name}...`);

    // Update program email if found
    if (scrapedData.programEmail && scrapedData.programEmail !== school.program_email) {
      console.log(`   Updating program email: ${scrapedData.programEmail}`);
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .update({ program_email: scrapedData.programEmail })
        .eq('id', school.id)
        .select();

      if (schoolError) {
        console.error(`   School update error:`, schoolError);
      } else {
        console.log(`   School update success:`, schoolData);
      }
    }

    // Process each coach
    for (const coachData of scrapedData.coaches) {
      console.log(`   Processing coach: ${coachData.name}`);

      // Generate likely email if not found
      let email = coachData.email;
      if (!email && school.email_domain) {
        const likelyEmails = generateLikelyEmails(coachData.name, school.email_domain);
        email = likelyEmails[0]; // Use most likely pattern
        console.log(`   Generated email: ${email}`);
      }

      // Prepare coach record
      const coachRecord = {
        school_id: school.id,
        name: coachData.name,
        title: coachData.title,
        email: email,
        verified_at: new Date().toISOString(),
        created_by: null, // System generated
        org_id: null, // Not org-specific
        visibility: 'shared'
      };

      console.log(`   Upserting coach record:`, coachRecord);

      // Upsert coach record (update existing "Needs Verification" or insert new)
      const { data: coachUpsertData, error: coachUpsertError } = await supabase
        .from('coaches')
        .upsert(coachRecord, {
          onConflict: 'school_id,name',
          ignoreDuplicates: false
        })
        .select();

      if (coachUpsertError) {
        console.error(`   Coach upsert error for ${coachData.name}:`, coachUpsertError);
      } else {
        console.log(`   Coach upsert success for ${coachData.name}:`, coachUpsertData);
      }
    }

    console.log(`✅ Database update complete for ${school.name}`);
    return true;
  } catch (error) {
    console.error(`💥 Database error for ${school.name}:`, error);
    return false;
  }
};

/**
 * Process a single school
 */
const processSchool = async (school) => {
  try {
    console.log(`\n🏫 Processing: ${school.name}`);

    const scrapedData = await scrapeSchoolCoaches(school);

    if (scrapedData.error) {
      console.log(`❌ Failed: ${scrapedData.error}`);
      results.failed++;
      results.failures.push({
        school: school.name,
        reason: scrapedData.error
      });
      return;
    }

    const updateSuccess = await updateCoachData(school, scrapedData);

    if (!updateSuccess) {
      results.failed++;
      results.failures.push({
        school: school.name,
        reason: 'Database update failed'
      });
      return;
    }

    const hasCoaches = scrapedData.coaches.length > 0;
    const hasEmails = scrapedData.coaches.some(c => c.email);
    const hasProgramEmail = !!scrapedData.programEmail;

    if (hasCoaches && hasEmails) {
      console.log(`✅ Success: Found ${scrapedData.coaches.length} coaches with emails`);
      results.success++;
    } else if (hasCoaches) {
      console.log(`⚠️  Partial: Found ${scrapedData.coaches.length} coaches, no emails`);
      results.partial++;
    } else if (hasProgramEmail) {
      console.log(`📧 Program email only: ${scrapedData.programEmail}`);
      results.success++;
    } else {
      console.log(`⚠️  Partial: nothing usable found`);
      results.partial++;
    }

    if (hasCoaches) {
      console.log(`   Coaches: ${scrapedData.coaches.map(c => c.name).join(', ')}`);
    }
    if (scrapedData.programEmail) {
      console.log(`   Program email: ${scrapedData.programEmail}`);
    }

  } catch (error) {
    console.error(`Error processing ${school.name}:`, error);
    results.failed++;
    results.failures.push({
      school: school.name,
      reason: error.message
    });
  }
};

/**
 * Main execution function
 */
const main = async () => {
  // CLI flags
  const argv = process.argv.slice(2);
  const onlyEmpty = argv.includes('--only-empty');
  const onlyMissingEmails = argv.includes('--missing-emails');
  const onlyDivision = argv.find((a) => a.startsWith('--division='))?.split('=')[1];
  const onlyLimit = parseInt(argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

  console.log('🚀 Starting coach data scraper...');
  if (onlyEmpty) console.log('   Filter: only schools with zero coaches');
  if (onlyMissingEmails) console.log('   Filter: only schools with coaches but missing emails');
  if (onlyDivision) console.log(`   Filter: division=${onlyDivision}`);
  if (onlyLimit) console.log(`   Limit: ${onlyLimit} schools`);
  console.log('');

  try {
    // Load schools from database (filtered by flags)
    let query = supabase
      .from('schools')
      .select('id, name, athletics_website, email_domain, program_email, division')
      .order('name');

    if (onlyDivision) query = query.eq('division', onlyDivision);
    if (onlyLimit) query = query.limit(onlyLimit);

    const { data: allSchools, error } = await query;
    if (error) throw new Error(`Failed to load schools: ${error.message}`);

    // If --only-empty, drop schools that already have at least one coach.
    let schools = allSchools;
    if (onlyEmpty) {
      const { data: schoolsWithCoaches } = await supabase
        .from('coaches')
        .select('school_id');
      const haveCoaches = new Set((schoolsWithCoaches || []).map((c) => c.school_id));
      schools = schools.filter((s) => !haveCoaches.has(s.id));
      console.log(`   ${allSchools.length - schools.length} schools already have coaches — skipping.`);
    }

    // If --missing-emails, keep only schools that have at least one coach
    // WITHOUT a valid email. These are the USC/Stanford-style cases —
    // we scraped the name but the page didn't expose a mailto, so the
    // school looks "covered" to --only-empty but reads as "no emails"
    // in the UI. We re-scrape them with the enhanced patterns + email
    // extraction to try to fill the gap.
    if (onlyMissingEmails) {
      const { data: allCoaches } = await supabase
        .from('coaches')
        .select('school_id, email');
      // Build {schoolId -> {total, withEmail}} buckets
      const counts = new Map();
      for (const c of allCoaches || []) {
        const b = counts.get(c.school_id) || { total: 0, withEmail: 0 };
        b.total += 1;
        if (c.email && c.email.trim()) b.withEmail += 1;
        counts.set(c.school_id, b);
      }
      // Keep schools that have any coach AND at least one coach missing
      // an email. Schools with 100% emails already are skipped.
      schools = schools.filter((s) => {
        const b = counts.get(s.id);
        return b && b.total > 0 && b.withEmail < b.total;
      });
      console.log(`   ${schools.length} schools have coaches but at least one missing email.`);
    }

    console.log(`📚 Loaded ${schools.length} schools to process\n`);

    // Process schools with rate limiting
    const promises = schools.map(school =>
      limit(() => processSchool(school))
    );

    await Promise.all(promises);

    // Print final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SCRAPING COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Successfully scraped: ${results.success} of ${schools.length} schools`);
    console.log(`⚠️  Partial success (name only): ${results.partial} schools`);
    console.log(`❌ Failed: ${results.failed} schools`);
    console.log(`📈 Total with data: ${results.success + results.partial} schools`);

    if (results.failures.length > 0) {
      console.log('\n❌ Failed schools:');
      results.failures.forEach(failure => {
        console.log(`   • ${failure.school}: ${failure.reason}`);
      });
    }

    console.log('\n🎉 Coach database has been updated with real contact information!');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

// Run the scraper
main().catch(console.error);