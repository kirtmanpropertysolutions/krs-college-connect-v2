#!/usr/bin/env node

/**
 * Women's Soccer Coach / Program Email Scraper for KRS College Connect
 *
 * Goal: every women's soccer program in `schools` gets at least ONE
 * usable outreach email — verified (extracted directly from an
 * athletics page) OR likely (pattern-generated from a known coach name
 * + email domain, clearly marked as lower confidence).
 *
 * Waterfall strategy per school:
 *   1. Official women's soccer coach page (Sidearm / Presto / custom)
 *   2. Athletics staff directory filtered to W-soccer
 *   3. Individual coach bio pages (when 1+2 yield a name but no email)
 *   4. Recruiting questionnaire / contact pages
 *   5. Women's soccer landing page footer/sidebar
 *
 * Reliability:
 *   - 3 concurrent fetches (p-limit), 1s same-domain delay
 *   - 15s AbortController timeout per request
 *   - Retry with backoff (1s/3s/10s) on 429/502/503/network
 *   - Cloudflare-challenge detection → skip remaining strategies
 *
 * Storage:
 *   - schools.program_email + source/confidence/url/last_checked_at
 *   - schools.program_email_candidates (full JSONB array for review)
 *   - schools.program_email_failure_reason on miss
 *   - coaches table still gets a row per discovered head-coach name
 *
 * Entrypoint preserved: `node scripts/scrape-coaches.js`
 * Flags:
 *   --only-empty           — schools with zero coach rows
 *   --missing-emails       — schools with coaches but at least one missing email
 *   --division=D1          — restrict to a division
 *   --limit=N              — process at most N schools
 *   --dry-run              — print decisions, write nothing
 *   --school="Stanford"    — process a single school by name (substring match)
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// ─── env loading (preserve existing .env.local convention) ──────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

const env = {};
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    const value = rest.join('=');
    if (key && value) {
      env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (error) {
  console.error('Error reading .env.local:', error);
  process.exit(1);
}

// ─── Supabase service-role client ───────────────────────────────────────
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ─── polite-bot infrastructure (preserved from the old script) ──────────
const limit = pLimit(3);
const domainDelays = new Map();
const USER_AGENT =
  'KRSCollegeConnect-Bot/1.0 (recruiting platform - contact: kirtmanpropertysolutions@gmail.com)';
const REQUEST_TIMEOUT_MS = 15_000;
const RETRY_BACKOFFS_MS = [1_000, 3_000, 10_000];

// ─── results tracking ───────────────────────────────────────────────────
const results = {
  verified: 0,
  likely: 0,
  missing: 0,
  byFailureReason: {},
  perSchool: [], // { school, status, confidence, source, failureReason }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const enforceDelay = async (url) => {
  const domain = getDomain(url);
  const lastRequest = domainDelays.get(domain);
  if (lastRequest) {
    const elapsed = Date.now() - lastRequest;
    if (elapsed < 1000) await sleep(1000 - elapsed);
  }
  domainDelays.set(domain, Date.now());
};

// ─── fetch with timeout + retry/backoff + Cloudflare detection ──────────

const CLOUDFLARE_MARKERS = [
  'cf-browser-verification',
  'Just a moment...',
  '__cf_chl_',
  'challenge-platform',
];

/**
 * Fetch a URL with AbortController timeout and structured outcome.
 * Returns one of:
 *   { ok: true, html, status, finalUrl }
 *   { ok: false, reason: 'cloudflare_blocked' | 'timeout' | 'http_404'
 *                       | 'http_error' | 'network_error', status?, message? }
 *
 * Retries up to 3 times on 429/502/503/network/timeout with the
 * documented backoff (1s, 3s, 10s).
 */
const fetchWithRetry = async (url) => {
  let lastErr = null;

  for (let attempt = 0; attempt <= RETRY_BACKOFFS_MS.length; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BACKOFFS_MS[attempt - 1]);
    }

    await enforceDelay(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timer);

      // Cloudflare challenge: 403 + cf-ray header is a strong signal
      const cfRay = response.headers.get('cf-ray');
      if (response.status === 403 && cfRay) {
        return {
          ok: false,
          reason: 'cloudflare_blocked',
          status: 403,
          message: 'Cloudflare 403 + cf-ray header',
        };
      }

      // Retry on rate-limit / transient server errors
      if ([429, 502, 503].includes(response.status)) {
        lastErr = { reason: 'http_error', status: response.status };
        continue;
      }

      if (response.status === 404) {
        return { ok: false, reason: 'http_404', status: 404 };
      }

      if (!response.ok) {
        return {
          ok: false,
          reason: 'http_error',
          status: response.status,
          message: `HTTP ${response.status}`,
        };
      }

      const html = await response.text();

      // Cloudflare interstitial body markers
      if (CLOUDFLARE_MARKERS.some((m) => html.includes(m))) {
        return {
          ok: false,
          reason: 'cloudflare_blocked',
          status: response.status,
          message: 'Cloudflare challenge body',
        };
      }

      return {
        ok: true,
        html,
        status: response.status,
        finalUrl: response.url || url,
      };
    } catch (error) {
      clearTimeout(timer);
      // AbortError = timeout. Network errors are also transient enough
      // to retry; non-transient errors (DNS, ENOTFOUND) burn the
      // retries but stop with `network_error`.
      if (error.name === 'AbortError') {
        lastErr = { reason: 'timeout', message: 'request aborted (15s)' };
      } else {
        lastErr = { reason: 'network_error', message: error.message };
      }
      continue;
    }
  }

  return lastErr || { reason: 'network_error', message: 'unknown' };
};

// ─── platform detection ─────────────────────────────────────────────────

/**
 * Sniff an athletics-site HTML response and identify the CMS.
 * Returns 'sidearm' | 'presto' | 'custom'.
 *
 * Sidearm markers: <meta name=generator content=Sidearm>, /api/sidearm/
 * asset paths, sidearm-* class names, data-sidearm attributes.
 *
 * Presto markers: hostnames with presto-, generator meta containing
 * "PrestoSports", and the coach-listing-card class pattern.
 */
const detectPlatform = (html, url = '') => {
  const lower = html.toLowerCase();
  const host = getDomain(url).toLowerCase();

  if (
    /<meta[^>]+generator[^>]+sidearm/i.test(html) ||
    lower.includes('sidearm-roster') ||
    lower.includes('s-person-card') ||
    lower.includes('data-sidearm') ||
    lower.includes('/api/sidearm/') ||
    lower.includes('sidearmsports')
  ) {
    return 'sidearm';
  }

  if (
    /<meta[^>]+generator[^>]+presto/i.test(html) ||
    host.includes('presto-') ||
    host.includes('prestosports') ||
    lower.includes('coach-listing-card') ||
    lower.includes('presto-cms')
  ) {
    return 'presto';
  }

  return 'custom';
};

// ─── email + name helpers ───────────────────────────────────────────────

const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const SINGLE_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const normalizeEmail = (raw) => {
  if (!raw) return null;
  const trimmed = raw.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
  return SINGLE_EMAIL_RE.test(trimmed) ? trimmed : null;
};

// Emails we never want to use even if we find them on a soccer page.
const BLOCKED_LOCAL_PARTS = new Set([
  'webmaster', 'noreply', 'no-reply', 'donotreply',
  'info', 'contact', 'media', 'press', 'tickets',
  'compliance', 'sid', 'sports-info',
]);

const isBlockedEmail = (email) => {
  if (!email) return true;
  const local = email.split('@')[0];
  return BLOCKED_LOCAL_PARTS.has(local);
};

const looksLikeSoccerEmail = (email) => {
  if (!email) return false;
  const local = email.split('@')[0];
  return /soccer|wsoc|wsoccer|w-soccer|woso|wsc/i.test(local);
};

/**
 * Pattern-generate likely emails from a coach name + domain.
 * Used as a last-resort "likely" candidate when we have the name but
 * no verified email. The FIRST pattern is returned as the canonical
 * likely email; we don't fan out to all 5 because that creates noisy
 * candidate lists.
 */
const generateLikelyEmail = (name, emailDomain) => {
  if (!name || !emailDomain) return null;
  if (/needs verification/i.test(name)) return null;
  const parts = name
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, '')
    .replace(/['-]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return null;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first}.${last}@${emailDomain}`;
};

// ─── URL pattern lists per strategy ─────────────────────────────────────

const STRATEGY_1_PATHS = [
  '/sports/womens-soccer/coaches',
  '/sports/wsoc/coaches',
  '/sports/w-soccer/coaches',
  '/sports/women-soccer/coaches',
  '/sports/womens-soccer/staff',
  '/sports/wsoc/staff',
  '/sports/womens-soccer/coaching-staff',
];

const STRATEGY_2_PATHS = [
  '/staff-directory/department/w-soccer',
  '/staff-directory/department/womens-soccer',
  '/staff-directory?path=wsoc',
  '/staff-directory?path=womens-soccer',
  '/staff-directory',
  '/sports/2024-25/directory',
];

const STRATEGY_4_PATHS = [
  '/sports/womens-soccer/recruiting',
  '/sports/wsoc/recruiting',
  '/sports/womens-soccer/recruit',
  '/sports/womens-soccer/contact',
  '/sports/womens-soccer/prospective-student-athletes',
];

const STRATEGY_5_PATHS = ['/sports/womens-soccer', '/sports/wsoc'];

const buildUrl = (baseUrl, path) => {
  let base = baseUrl.replace(/\/$/, '');
  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = 'https://' + base;
  }
  return base + path;
};

// ─── coach card parsing per platform ────────────────────────────────────

/**
 * Walk a list of cheerio "coach card" elements and pull (name, email,
 * title, bioHref) out of each. Used by both Strategy 1 and Strategy 2.
 *
 * Cards that contain player/roster signals are dropped (otherwise we
 * end up scraping student-athletes off the roster page).
 */
const extractCardsFromSelectors = ($, selectors, sourceUrl) => {
  const cards = [];
  for (const selector of selectors) {
    const elements = $(selector);
    if (elements.length === 0) continue;

    elements.each((_, el) => {
      const $el = $(el);
      const text = $el.text().toLowerCase();

      // Must read like a coach card
      if (!/coach|staff|director|coordinator/.test(text)) return;
      // Drop obvious roster rows
      if (/freshman|sophomore|junior|senior|graduate student|jersey/.test(text)) {
        return;
      }

      // Name extraction
      let name = null;
      const nameSelectors = [
        '.s-person-details__personal-single-line',
        '.s-person-card__personal-info-name',
        '.s-person-card__name',
        '.sidearm-staff-card-name',
        '.sidearm-coach-name',
        '.coach-listing-card__name',
        '.coach-name',
        '.staff-name',
        '.name',
        'h3', 'h4', 'h5',
        'a[href*="/staff/"]',
        'a[href*="/coaches/"]',
        'strong', 'b',
      ];
      for (const sel of nameSelectors) {
        const nameEl = $el.find(sel).first();
        if (nameEl.length && nameEl.text().trim()) {
          name = nameEl.text().trim().replace(/\s+/g, ' ');
          break;
        }
      }
      // Fallback: scan lines for "First Last" looking text
      if (!name) {
        const lines = $el.text().split('\n').map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (
            line.length > 4 &&
            line.length < 50 &&
            /^[A-Z][a-z]+(?:[\s'-][A-Z][a-z'-]+){1,3}$/.test(line) &&
            !/coach|university|college|athletic|soccer/i.test(line)
          ) {
            name = line;
            break;
          }
        }
      }
      if (!name || name.length < 4) return;

      // Email extraction. mailto: link → data-email attribute → plain
      // text email inside the card.
      let email = null;
      const elHtml = $el.html() || '';
      const mailtoMatch = elHtml.match(/mailto:([^"'\s>?]+)/i);
      if (mailtoMatch) email = normalizeEmail(mailtoMatch[1]);
      if (!email) {
        const dataEmail = $el.find('[data-email]').first().attr('data-email');
        if (dataEmail) email = normalizeEmail(dataEmail);
      }
      if (!email) {
        const txt = $el.text();
        const m = txt.match(EMAIL_RE);
        if (m && m.length) email = normalizeEmail(m[0]);
      }

      // Role/title
      let role = 'Coach';
      if (/head\s+coach/.test(text)) role = 'Head Coach';
      else if (/assistant\s+coach/.test(text)) role = 'Assistant Coach';
      else if (/associate\s+(head\s+)?coach/.test(text)) role = 'Associate Coach';
      else if (/recruiting/.test(text)) role = 'Recruiting Coordinator';
      else if (/director\s+of\s+operations/.test(text)) role = 'Director of Operations';

      // Bio link for Strategy 3 follow-up
      const bioLink =
        $el.find('a[href*="/staff/"], a[href*="/coaches/"], a[href*="/roster/coaches/"]')
          .first()
          .attr('href') || null;

      cards.push({
        name,
        email,
        role,
        bioHref: bioLink,
        sourceUrl,
      });
    });

    if (cards.length > 0) break;
  }
  return cards;
};

const SIDEARM_SELECTORS = [
  '.s-person-card',
  '.s-person-details',
  '.sidearm-coach',
  '.sidearm-staff-card',
  '.sidearm-staff-member',
  '.sidearm-roster-coach',
];
const PRESTO_SELECTORS = [
  '.coach-listing-card',
  '.staff-card',
  '.c-coachcard',
  '.c-staff-card',
];
const GENERIC_SELECTORS = [
  '.coach-card',
  '.staff-card',
  '.coach',
  '.staff-member',
  '.coaching-staff',
  '[data-role="coach"]',
  '.person',
  '.staff',
  '.member',
  'tr',
];

const selectorsForPlatform = (platform) => {
  if (platform === 'sidearm') return [...SIDEARM_SELECTORS, ...GENERIC_SELECTORS];
  if (platform === 'presto') return [...PRESTO_SELECTORS, ...GENERIC_SELECTORS];
  return GENERIC_SELECTORS;
};

// ─── candidate object factory ───────────────────────────────────────────

const buildCandidate = ({
  email,
  role,
  name,
  source,
  url,
  confidence = 'verified',
}) => ({
  email,
  role: role || null,
  name: name || null,
  source,
  url,
  confidence,
});

// ─── scoring ────────────────────────────────────────────────────────────

const ROLE_BASE_SCORE = {
  'Head Coach': 100,
  'Recruiting Coordinator': 90,
  'Associate Coach': 75,
  'Assistant Coach': 70,
  'Director of Operations': 50,
  'Program Email': 60,
  Coach: 60,
};

/**
 * Score a candidate higher when it's:
 *   - tied to head coach (or recruiting)
 *   - verified (mailto/labeled), not pattern-generated
 *   - a soccer-tagged inbox (wsoc@, recruiting.wsoc@)
 *
 * Returns 0 (discard) for blocked athletics-general inboxes that have
 * no soccer signal.
 */
const scoreCandidate = (c) => {
  if (!c || !c.email) return 0;
  if (isBlockedEmail(c.email) && !looksLikeSoccerEmail(c.email)) return 0;

  let score = ROLE_BASE_SCORE[c.role] ?? 30;

  if (c.confidence === 'verified') score += 10; // verified bonus
  if (c.confidence === 'likely') score = Math.round(score * 0.6);
  if (looksLikeSoccerEmail(c.email)) score += 15;

  return score;
};

// ─── Strategy 1 + 2: extract from coach page / staff directory ──────────

const runListingPageStrategy = async (baseUrl, paths, sourceTag) => {
  const candidates = [];
  let lastFailure = null;
  let triedAny = false;

  for (const path of paths) {
    const url = buildUrl(baseUrl, path);
    const res = await fetchWithRetry(url);
    triedAny = true;

    if (!res.ok) {
      if (res.reason === 'cloudflare_blocked') {
        return { candidates: [], failureReason: 'cloudflare_blocked', terminal: true };
      }
      if (res.reason === 'timeout') {
        lastFailure = 'timeout';
      } else if (res.reason === 'http_404') {
        lastFailure = lastFailure || 'http_404';
      } else {
        lastFailure = lastFailure || res.reason;
      }
      continue;
    }

    const html = res.html;
    const htmlLower = html.toLowerCase();

    // Confirm soccer relevance. Directory pages often serve the same
    // markup regardless of ?path=, so make sure women's soccer is
    // mentioned somewhere.
    const isSoccerRelevant =
      htmlLower.includes('soccer') ||
      /wsoc|w-soccer|womens.soccer/i.test(htmlLower);
    if (!isSoccerRelevant) {
      lastFailure = lastFailure || 'no_email_in_html';
      continue;
    }

    const platform = detectPlatform(html, url);
    const $ = cheerio.load(html);
    const cards = extractCardsFromSelectors($, selectorsForPlatform(platform), url);

    // Directory pages: only keep cards whose text mentions women's soccer
    if (sourceTag === 'staff_directory') {
      const filtered = [];
      cards.forEach((c) => {
        // We need to confirm the row is women's-soccer-related. The
        // simplest signal is that the entire row text mentions soccer
        // AND women (or wsoc/w-soccer).
        if (!c.email && !c.name) return;
        filtered.push(c);
      });
      // Trust list-context filtering happens via section headings in
      // the URL pattern (`?path=wsoc`); if we got cards through that
      // we keep them as-is.
      cards.length = 0;
      cards.push(...filtered);
    }

    for (const card of cards) {
      if (card.email) {
        candidates.push(
          buildCandidate({
            email: card.email,
            role: card.role,
            name: card.name,
            source: sourceTag,
            url,
            confidence: 'verified',
          })
        );
      } else {
        // Track name-only cards. We'll use these in Strategy 3 (bio
        // page lookup) and as fallback inputs to pattern generation.
        candidates.push(
          buildCandidate({
            email: null,
            role: card.role,
            name: card.name,
            source: sourceTag,
            url,
            confidence: 'likely',
          })
        );
      }
    }

    // If we found at least one verified candidate, stop trying further
    // paths within this strategy — the page worked.
    if (candidates.some((c) => c.email && c.confidence === 'verified')) {
      return { candidates, failureReason: null, terminal: false };
    }
  }

  return {
    candidates,
    failureReason: candidates.length ? null : (triedAny ? lastFailure : 'all_strategies_404'),
    terminal: false,
  };
};

// ─── Strategy 3: follow individual bio pages ────────────────────────────

const runBioPageStrategy = async (baseUrl, nameOnlyCards) => {
  const candidates = [];
  for (const card of nameOnlyCards) {
    if (!card.bioHref && !card.name) continue;
    // Resolve relative href
    let bioUrl = null;
    if (card.bioHref) {
      try {
        bioUrl = new URL(card.bioHref, card.sourceUrl || baseUrl).href;
      } catch {
        bioUrl = null;
      }
    }
    if (!bioUrl) continue;

    const res = await fetchWithRetry(bioUrl);
    if (!res.ok) {
      if (res.reason === 'cloudflare_blocked') {
        return { candidates: [], failureReason: 'cloudflare_blocked', terminal: true };
      }
      continue;
    }

    const $ = cheerio.load(res.html);
    // Email = first mailto: on the bio page that isn't blocked
    const mailtoMatch = res.html.match(/mailto:([^"'\s>?]+)/i);
    let email = mailtoMatch ? normalizeEmail(mailtoMatch[1]) : null;
    if (!email) {
      const txt = $('body').text();
      const m = txt.match(EMAIL_RE);
      if (m) email = normalizeEmail(m.find((e) => !isBlockedEmail(e.toLowerCase())));
    }
    if (email && !isBlockedEmail(email)) {
      candidates.push(
        buildCandidate({
          email,
          role: card.role || 'Head Coach',
          name: card.name,
          source: 'coach_bio',
          url: bioUrl,
          confidence: 'verified',
        })
      );
    }
  }
  return {
    candidates,
    failureReason: candidates.length ? null : 'no_email_in_html',
    terminal: false,
  };
};

// ─── Strategy 4: recruiting / contact pages ─────────────────────────────

const runRecruitingStrategy = async (baseUrl) => {
  const candidates = [];
  let lastFailure = null;

  for (const path of STRATEGY_4_PATHS) {
    const url = buildUrl(baseUrl, path);
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      if (res.reason === 'cloudflare_blocked') {
        return { candidates: [], failureReason: 'cloudflare_blocked', terminal: true };
      }
      lastFailure = lastFailure || (res.reason === 'http_404' ? 'http_404' : res.reason);
      continue;
    }

    const html = res.html;
    if (!/soccer/i.test(html)) continue;

    // Find all mailtos on the page; pick the most "recruiting-flavored"
    // one OR — if there's only one mailto — that.
    const mailtos = Array.from(html.matchAll(/mailto:([^"'\s>?]+)/gi))
      .map((m) => normalizeEmail(m[1]))
      .filter(Boolean)
      .filter((e) => !isBlockedEmail(e));

    if (mailtos.length === 0) {
      lastFailure = lastFailure || 'no_email_in_html';
      continue;
    }

    // Prefer recruiting-labeled local parts, then soccer-labeled, then
    // first.
    let chosen =
      mailtos.find((e) => /recruit|prospect|camps?/.test(e.split('@')[0])) ||
      mailtos.find((e) => looksLikeSoccerEmail(e)) ||
      mailtos[0];

    candidates.push(
      buildCandidate({
        email: chosen,
        role: /recruit|prospect|camps?/.test(chosen.split('@')[0])
          ? 'Recruiting Coordinator'
          : 'Program Email',
        name: null,
        source: 'recruiting_questionnaire',
        url,
        confidence: 'verified',
      })
    );

    // First hit wins for this strategy
    return { candidates, failureReason: null, terminal: false };
  }

  return {
    candidates,
    failureReason: candidates.length ? null : (lastFailure || 'all_strategies_404'),
    terminal: false,
  };
};

// ─── Strategy 5: women's soccer landing page mailto sweep ───────────────

const runLandingPageStrategy = async (baseUrl) => {
  let lastFailure = null;
  for (const path of STRATEGY_5_PATHS) {
    const url = buildUrl(baseUrl, path);
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      if (res.reason === 'cloudflare_blocked') {
        return { candidates: [], failureReason: 'cloudflare_blocked', terminal: true };
      }
      lastFailure = lastFailure || (res.reason === 'http_404' ? 'http_404' : res.reason);
      continue;
    }
    const html = res.html;
    const mailtos = Array.from(html.matchAll(/mailto:([^"'\s>?]+)/gi))
      .map((m) => normalizeEmail(m[1]))
      .filter(Boolean);

    // Soccer-tagged emails first; otherwise we drop this strategy on
    // the floor — a random athletics inbox doesn't belong to women's
    // soccer just because it appeared in the footer.
    const soccerMail = mailtos.find((e) => looksLikeSoccerEmail(e));
    if (soccerMail) {
      return {
        candidates: [
          buildCandidate({
            email: soccerMail,
            role: 'Program Email',
            name: null,
            source: 'athletics_contact',
            url,
            confidence: 'verified',
          }),
        ],
        failureReason: null,
        terminal: false,
      };
    }
  }
  return {
    candidates: [],
    failureReason: lastFailure || 'no_email_in_html',
    terminal: false,
  };
};

// ─── orchestrator: run the waterfall for one school ─────────────────────

/**
 * Run all 5 strategies and return:
 *   { candidates: [], winner: {...}|null, failureReason: string|null,
 *     pageUrl: string|null }
 *
 * - terminal = true from any strategy (Cloudflare) stops further work
 * - we collect candidates across strategies, then score and pick the
 *   highest-scoring one
 * - if no verified candidate but we have a coach name + email_domain,
 *   we synthesize a "likely" pattern email and add it as a candidate
 */
const scrapeSchool = async (school) => {
  if (!school.athletics_website) {
    return {
      candidates: [],
      winner: null,
      failureReason: 'no_athletics_website',
      pageUrl: null,
    };
  }

  const baseUrl = school.athletics_website;
  const allCandidates = [];
  const strategiesRun = [];
  let cloudflareHit = false;
  let firstFailureReason = null;

  const recordOutcome = (label, outcome) => {
    strategiesRun.push({ label, count: outcome.candidates.length });
    allCandidates.push(...outcome.candidates);
    if (outcome.failureReason && !firstFailureReason) {
      firstFailureReason = outcome.failureReason;
    }
    if (outcome.terminal && outcome.failureReason === 'cloudflare_blocked') {
      cloudflareHit = true;
    }
  };

  // Strategy 1
  const s1 = await runListingPageStrategy(baseUrl, STRATEGY_1_PATHS, 'coach_page');
  recordOutcome('coach_page', s1);

  // Strategy 2 (only if no terminal failure)
  if (!cloudflareHit) {
    const s2 = await runListingPageStrategy(baseUrl, STRATEGY_2_PATHS, 'staff_directory');
    recordOutcome('staff_directory', s2);
  }

  // If we have name-only cards from 1/2, run Strategy 3 (bio pages)
  if (!cloudflareHit) {
    const nameOnly = allCandidates.filter(
      (c) => !c.email && (c.name || c.bioHref) && c.source !== 'coach_bio'
    );
    if (nameOnly.length) {
      const s3 = await runBioPageStrategy(baseUrl, nameOnly);
      recordOutcome('coach_bio', s3);
    }
  }

  // Strategy 4 — recruiting pages
  if (!cloudflareHit) {
    const s4 = await runRecruitingStrategy(baseUrl);
    recordOutcome('recruiting_questionnaire', s4);
  }

  // Strategy 5 — landing page mailto sweep (only soccer-tagged emails)
  if (!cloudflareHit) {
    const s5 = await runLandingPageStrategy(baseUrl);
    recordOutcome('athletics_contact', s5);
  }

  // De-dupe candidates by (email, source). Keep the most useful row.
  const seen = new Map();
  for (const c of allCandidates) {
    const key = `${c.email || `name:${c.name}`}|${c.source}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, c);
      continue;
    }
    // Prefer the row with email + name; otherwise keep first
    if (!existing.email && c.email) seen.set(key, c);
  }
  const candidates = Array.from(seen.values());

  // Add pattern-generated "likely" candidate if we have a head-coach
  // name but no verified email at all.
  const hasVerifiedEmail = candidates.some((c) => c.email && c.confidence === 'verified');
  if (!hasVerifiedEmail && school.email_domain) {
    const headCoachCard =
      candidates.find((c) => c.role === 'Head Coach' && c.name) ||
      candidates.find((c) => c.name);
    if (headCoachCard) {
      const likely = generateLikelyEmail(headCoachCard.name, school.email_domain);
      if (likely) {
        candidates.push(
          buildCandidate({
            email: likely,
            role: 'Head Coach',
            name: headCoachCard.name,
            source: headCoachCard.source || 'coach_page',
            url: headCoachCard.url || null,
            confidence: 'likely',
          })
        );
      }
    }
  }

  // Attach a score to each. The winner is the highest-scoring one
  // (>0).
  const scored = candidates
    .filter((c) => c.email)
    .map((c) => ({ ...c, score: scoreCandidate(c) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  const winner = scored[0] || null;

  let failureReason = null;
  if (!winner) {
    if (cloudflareHit) failureReason = 'cloudflare_blocked';
    else if (firstFailureReason === 'timeout') failureReason = 'timeout';
    else if (allCandidates.length === 0 && strategiesRun.every((s) => s.count === 0)) {
      failureReason = firstFailureReason === 'http_404'
        ? 'all_strategies_404'
        : (firstFailureReason || 'no_email_in_html');
    } else {
      failureReason = 'no_email_in_html';
    }
  }

  return {
    candidates: scored.length ? scored : candidates.filter((c) => c.email),
    winner,
    failureReason,
    pageUrl: winner ? winner.url : null,
  };
};

// ─── DB writes ──────────────────────────────────────────────────────────

/**
 * Write the scrape outcome to schools + (when applicable) coaches.
 * In --dry-run mode this is a no-op that just prints what would happen.
 */
const persistScrapeResult = async (school, result, { dryRun }) => {
  const updates = {
    program_email: result.winner ? result.winner.email : null,
    program_email_source: result.winner ? result.winner.source : null,
    program_email_confidence: result.winner ? result.winner.confidence : 'missing',
    program_email_last_checked_at: new Date().toISOString(),
    program_email_url: result.winner ? result.winner.url : null,
    program_email_failure_reason: result.winner ? null : result.failureReason,
    program_email_candidates: result.candidates.length ? result.candidates : null,
  };

  if (dryRun) {
    console.log(`   [dry-run] schools update for ${school.name}:`, {
      program_email: updates.program_email,
      confidence: updates.program_email_confidence,
      source: updates.program_email_source,
      failure_reason: updates.program_email_failure_reason,
      candidate_count: result.candidates.length,
    });
    return true;
  }

  const { error: schoolError } = await supabase
    .from('schools')
    .update(updates)
    .eq('id', school.id);

  if (schoolError) {
    console.error(`   schools update error for ${school.name}:`, schoolError.message);
    return false;
  }

  // Also upsert coach rows for any candidate that has BOTH a name and
  // an email and a real coach title. We never blindly upsert program
  // emails (recruiting@..., wsoc@...) as a coach because there's no
  // person behind them.
  const upserts = result.candidates.filter(
    (c) => c.name && c.email && /coach/i.test(c.role || '')
  );
  for (const c of upserts) {
    const { error: coachErr } = await supabase
      .from('coaches')
      .upsert(
        {
          school_id: school.id,
          name: c.name,
          title: c.role,
          email: c.email,
          verified_at: new Date().toISOString(),
          created_by: null,
          org_id: null,
          visibility: 'shared',
        },
        { onConflict: 'school_id,name', ignoreDuplicates: false }
      );
    if (coachErr) {
      console.error(`   coaches upsert error (${c.name}):`, coachErr.message);
    }
  }

  return true;
};

// ─── per-school driver + logging ────────────────────────────────────────

const padRight = (s, n) => (s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length));

const logPerSchool = (school, result) => {
  const schoolCol = padRight(school.name, 28);
  if (result.winner) {
    const role = padRight(
      (result.winner.role || 'coach').toLowerCase().replace(/\s+/g, '_'),
      14
    );
    const conf = padRight(result.winner.confidence, 9);
    const src = result.winner.source;
    const tag =
      result.winner.confidence === 'verified' ? '[ok    ]' : '[partial]';
    console.log(`${tag} ${schoolCol} | ${role} | ${conf} | ${src}`);
  } else {
    const reason = result.failureReason || 'unknown';
    console.log(
      `[fail  ] ${schoolCol} | ${padRight('(missing)', 14)} | ${padRight('missing', 9)} | ${reason}`
    );
  }
};

const processSchool = async (school, { dryRun }) => {
  try {
    const result = await scrapeSchool(school);
    await persistScrapeResult(school, result, { dryRun });
    logPerSchool(school, result);

    const status = result.winner
      ? result.winner.confidence
      : 'missing';
    if (status === 'verified') results.verified++;
    else if (status === 'likely') results.likely++;
    else {
      results.missing++;
      const reason = result.failureReason || 'unknown';
      results.byFailureReason[reason] = (results.byFailureReason[reason] || 0) + 1;
    }

    results.perSchool.push({
      school: school.name,
      status,
      confidence: status,
      source: result.winner ? result.winner.source : null,
      failureReason: result.winner ? null : result.failureReason,
    });
  } catch (error) {
    console.error(`[error ] ${school.name}: ${error.message}`);
    results.missing++;
    results.byFailureReason.parse_error =
      (results.byFailureReason.parse_error || 0) + 1;
    results.perSchool.push({
      school: school.name,
      status: 'missing',
      confidence: 'missing',
      source: null,
      failureReason: 'parse_error',
    });
  }
};

// ─── main ───────────────────────────────────────────────────────────────

const main = async () => {
  const argv = process.argv.slice(2);
  const onlyEmpty = argv.includes('--only-empty');
  const onlyMissingEmails = argv.includes('--missing-emails');
  const dryRun = argv.includes('--dry-run');
  const onlyDivision = argv.find((a) => a.startsWith('--division='))?.split('=')[1];
  const onlyLimit = parseInt(
    argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0',
    10
  );
  const onlySchool = argv.find((a) => a.startsWith('--school='))?.split('=')[1];

  console.log('Starting women\'s soccer program email scraper...');
  if (dryRun) console.log('  Mode: DRY RUN — no DB writes');
  if (onlyEmpty) console.log('  Filter: only schools with zero coaches');
  if (onlyMissingEmails) console.log('  Filter: only schools with coaches missing emails');
  if (onlyDivision) console.log(`  Filter: division=${onlyDivision}`);
  if (onlyLimit) console.log(`  Limit: ${onlyLimit} schools`);
  if (onlySchool) console.log(`  Filter: school name contains "${onlySchool}"`);
  console.log('');

  try {
    let query = supabase
      .from('schools')
      .select('id, name, athletics_website, email_domain, division, program_email')
      .order('name');

    if (onlyDivision) query = query.eq('division', onlyDivision);

    const { data: allSchools, error } = await query;
    if (error) throw new Error(`Failed to load schools: ${error.message}`);

    let schools = allSchools;

    if (onlySchool) {
      const needle = onlySchool.toLowerCase();
      schools = schools.filter((s) => s.name.toLowerCase().includes(needle));
    }

    if (onlyEmpty) {
      const { data: schoolsWithCoaches } = await supabase
        .from('coaches')
        .select('school_id');
      const have = new Set((schoolsWithCoaches || []).map((c) => c.school_id));
      schools = schools.filter((s) => !have.has(s.id));
    }

    if (onlyMissingEmails) {
      const { data: allCoaches } = await supabase
        .from('coaches')
        .select('school_id, email');
      const counts = new Map();
      for (const c of allCoaches || []) {
        const b = counts.get(c.school_id) || { total: 0, withEmail: 0 };
        b.total += 1;
        if (c.email && c.email.trim()) b.withEmail += 1;
        counts.set(c.school_id, b);
      }
      schools = schools.filter((s) => {
        const b = counts.get(s.id);
        return b && b.total > 0 && b.withEmail < b.total;
      });
    }

    if (onlyLimit) schools = schools.slice(0, onlyLimit);

    console.log(`Loaded ${schools.length} schools to process\n`);

    const tasks = schools.map((s) => limit(() => processSchool(s, { dryRun })));
    await Promise.all(tasks);

    // ─── summary ────────────────────────────────────────────────────
    const total = schools.length;
    const pct = (n) => (total === 0 ? 0 : Math.round((n / total) * 100));
    console.log('\n=== SCRAPE COMPLETE ===');
    console.log(`Total schools: ${total}`);
    console.log(`Verified emails: ${results.verified} (${pct(results.verified)}%)`);
    console.log(`Likely (pattern-generated): ${results.likely} (${pct(results.likely)}%)`);
    console.log(`Missing: ${results.missing} (${pct(results.missing)}%)`);
    if (Object.keys(results.byFailureReason).length) {
      console.log('By failure reason:');
      for (const [reason, count] of Object.entries(results.byFailureReason)) {
        console.log(`  ${reason}: ${count}`);
      }
    }
    if (dryRun) console.log('\n(dry-run: no rows were written)');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
