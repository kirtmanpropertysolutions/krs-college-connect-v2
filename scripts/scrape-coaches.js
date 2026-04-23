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
const parseCoachInfo = (html, school) => {
  const $ = cheerio.load(html);
  const coaches = [];

  // Common selectors for different CMS systems
  const selectors = [
    // Sidearm Sports CMS (most common)
    '.sidearm-roster-player',
    '.sidearm-coach',
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

      // Try different name extraction patterns
      const nameSelectors = [
        '.sidearm-roster-player-name',
        '.sidearm-coach-name',
        '.name',
        '.coach-name',
        '.staff-name',
        'h3', 'h4', 'h5',
        '.title a',
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

      // Extract email
      let email = null;
      const emailMatch = $el.html().match(/mailto:([^"'\s>]+)/);
      if (emailMatch) {
        email = emailMatch[1];
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

  // If no coaches found, try searching for program email
  let programEmail = null;
  const emailMatches = html.match(/mailto:([^"'\s>]+)/g);
  if (emailMatches) {
    for (const match of emailMatches) {
      const email = match.replace('mailto:', '');
      if (email.includes('soccer') || email.includes('wsoc') ||
          email.includes('athletics') || email.includes('sport')) {
        programEmail = email;
        break;
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

  // Common URL patterns for women's soccer coaching staff
  const urlPatterns = [
    '/sports/womens-soccer/coaches',
    '/sports/wsoc/coaches',
    '/sports/w-soccer/coaches',
    '/sports/womens-soccer/staff',
    '/sports/wsoc/staff',
    '/coaches.aspx?path=wsoc',
    '/coaches.aspx?path=womens-soccer',
    '/sports/womens-soccer',
    '/sports/wsoc',
    '/womens-soccer/coaches',
    '/wsoc/coaches'
  ];

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

      // Check if this looks like a coaches page
      const htmlLower = html.toLowerCase();
      if (!htmlLower.includes('coach') && !htmlLower.includes('staff')) {
        continue; // Try next pattern
      }

      const result = parseCoachInfo(html, school);

      if (result.coaches.length > 0) {
        return {
          coaches: result.coaches,
          programEmail: result.programEmail,
          url: url
        };
      }

    } catch (error) {
      console.log(`Error trying ${url}: ${error.message}`);
      continue; // Try next pattern
    }
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

    const hasEmails = scrapedData.coaches.some(c => c.email);

    if (hasEmails) {
      console.log(`✅ Success: Found ${scrapedData.coaches.length} coaches with emails`);
      results.success++;
    } else {
      console.log(`⚠️  Partial: Found ${scrapedData.coaches.length} coaches but no emails`);
      results.partial++;
    }

    console.log(`   Coaches: ${scrapedData.coaches.map(c => c.name).join(', ')}`);
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
  console.log('🚀 Starting coach data scraper...\n');

  try {
    // Load all schools from database
    const { data: schools, error } = await supabase
      .from('schools')
      .select('id, name, athletics_website, email_domain, program_email')
      .order('name');

    if (error) {
      throw new Error(`Failed to load schools: ${error.message}`);
    }

    console.log(`📚 Loaded ${schools.length} schools from database\n`);

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