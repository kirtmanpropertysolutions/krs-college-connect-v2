#!/usr/bin/env node

/**
 * Test UCLA-only coach scraper to debug database upsert issues
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
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

console.log('🔧 Testing Stanford scraper with database logging...\n');

// Test the database connection first
async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, athletics_website, email_domain')
      .eq('name', 'Stanford University')
      .single();

    if (error) {
      console.error('❌ Database connection error:', error);
      return null;
    }

    console.log('✅ Database connected. Stanford school record:', data);
    return data;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return null;
  }
}

// Check current coaches for Stanford
async function getCurrentStanfordCoaches(schoolId) {
  console.log('\n🔍 Checking current Stanford coaches in database...');
  try {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('school_id', schoolId);

    if (error) {
      console.error('❌ Error fetching current coaches:', error);
      return [];
    }

    console.log(`📊 Found ${data.length} existing coaches:`);
    data.forEach(coach => {
      console.log(`   • ${coach.name} (${coach.title}) - ${coach.email || 'no email'} - verified: ${coach.verified_at ? 'YES' : 'NO'}`);
    });

    return data;
  } catch (error) {
    console.error('❌ Error fetching coaches:', error);
    return [];
  }
}

// Generate likely email addresses from name and domain
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

  return [
    `${firstName}.${lastName}@${emailDomain}`,
    `${firstName}${lastName}@${emailDomain}`,
    `${firstName.charAt(0)}${lastName}@${emailDomain}`,
  ];
};

// Parse HTML to extract coach information (simplified for UCLA test)
const parseCoachInfo = (html) => {
  const $ = cheerio.load(html);
  const coaches = [];

  console.log('🔍 Parsing HTML for coach information...');

  // Look for coach cards, names, emails
  $('.sidearm-roster-player, .staff-card, .coach').each((_, element) => {
    const $el = $(element);
    const text = $el.text().toLowerCase();

    if (!text.includes('coach') && !text.includes('staff')) return;

    // Extract name
    let name = null;
    const nameSelectors = ['.name', '.coach-name', 'h3', 'h4', 'strong'];

    for (const selector of nameSelectors) {
      const nameEl = $el.find(selector).first();
      if (nameEl.length && nameEl.text().trim()) {
        name = nameEl.text().trim();
        break;
      }
    }

    if (!name || name.length < 5) return;

    // Extract email
    let email = null;
    const emailMatch = $el.html().match(/mailto:([^"'\s>]+)/);
    if (emailMatch) {
      email = emailMatch[1];
    }

    const title = text.includes('head coach') ? 'Head Coach' :
                 text.includes('assistant') ? 'Assistant Coach' : 'Coach';

    if (!coaches.find(c => c.name === name)) {
      coaches.push({ name, email, title });
      console.log(`   Found coach: ${name} (${title}) - ${email || 'no email'}`);
    }
  });

  return { coaches };
};

// Attempt to scrape Stanford
const scrapeStanford = async (school) => {
  let baseUrl = school.athletics_website;
  if (!baseUrl.startsWith('http')) {
    baseUrl = 'https://' + baseUrl;
  }

  const urlPatterns = [
    '/sports/womens-soccer/coaches',
    '/sports/wsoc/coaches',
    '/sports/womens-soccer/staff'
  ];

  for (const pattern of urlPatterns) {
    const url = baseUrl + pattern;
    console.log(`\n🌐 Trying: ${url}`);

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'KRSCollegeConnect-Bot/1.0' },
        timeout: 10000
      });

      if (!response.ok) {
        console.log(`   ❌ HTTP ${response.status}`);
        continue;
      }

      const html = await response.text();
      console.log(`   ✅ HTTP 200 - HTML length: ${html.length} chars`);

      const htmlLower = html.toLowerCase();
      if (!htmlLower.includes('coach')) {
        console.log(`   ⚠️  No coach content found`);
        continue;
      }

      const result = parseCoachInfo(html);

      if (result.coaches.length > 0) {
        console.log(`   ✅ Found ${result.coaches.length} coaches!`);
        return result;
      } else {
        console.log(`   ⚠️  HTML contains 'coach' but no coaches parsed`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  return { coaches: [] };
};

// Update database with test logging
const updateStanfordCoaches = async (school, scrapedData) => {
  console.log(`\n📝 TESTING DATABASE UPDATE for ${school.name}...`);

  try {
    for (const coachData of scrapedData.coaches) {
      console.log(`\n👤 Processing coach: ${coachData.name}`);

      let email = coachData.email;
      if (!email && school.email_domain) {
        const likelyEmails = generateLikelyEmails(coachData.name, school.email_domain);
        email = likelyEmails[0];
        console.log(`   Generated email: ${email}`);
      }

      const coachRecord = {
        school_id: school.id,
        name: coachData.name,
        title: coachData.title,
        email: email,
        verified_at: new Date().toISOString(),
        created_by: null,
        org_id: null,
        visibility: 'shared'
      };

      console.log(`   📋 Coach record to upsert:`, coachRecord);

      const { data: upsertData, error: upsertError } = await supabase
        .from('coaches')
        .upsert(coachRecord, {
          onConflict: 'school_id,name',
          ignoreDuplicates: false
        })
        .select();

      if (upsertError) {
        console.error(`   ❌ Upsert error:`, upsertError);
        return false;
      } else {
        console.log(`   ✅ Upsert success:`, upsertData);
      }
    }

    return true;
  } catch (error) {
    console.error(`💥 Database update error:`, error);
    return false;
  }
};

// Main test function
async function main() {
  // Test database connection
  const stanfordSchool = await testDatabaseConnection();
  if (!stanfordSchool) {
    console.error('❌ Cannot continue without database connection');
    process.exit(1);
  }

  // Check current state
  const beforeCoaches = await getCurrentStanfordCoaches(stanfordSchool.id);

  // Attempt to scrape
  console.log('\n🔍 ATTEMPTING TO SCRAPE STANFORD...');
  const scrapedData = await scrapeStanford(stanfordSchool);

  if (scrapedData.coaches.length === 0) {
    console.log('❌ No coaches found during scraping');
    return;
  }

  // Attempt database update
  const updateSuccess = await updateStanfordCoaches(stanfordSchool, scrapedData);

  // Check final state
  console.log('\n🔍 CHECKING FINAL DATABASE STATE...');
  const afterCoaches = await getCurrentStanfordCoaches(stanfordSchool.id);

  console.log('\n' + '='.repeat(60));
  console.log('📊 STANFORD TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Before: ${beforeCoaches.length} coaches`);
  console.log(`Scraped: ${scrapedData.coaches.length} coaches`);
  console.log(`Update success: ${updateSuccess}`);
  console.log(`After: ${afterCoaches.length} coaches`);
  console.log(`Verified coaches after: ${afterCoaches.filter(c => c.verified_at).length}`);

  if (updateSuccess && afterCoaches.length > beforeCoaches.length) {
    console.log('✅ TEST PASSED: Database was updated successfully!');
  } else {
    console.log('❌ TEST FAILED: Database was not updated');
  }
}

main().catch(console.error);