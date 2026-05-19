#!/usr/bin/env node

/**
 * Export women's-soccer program-email coverage to CSV for admin triage.
 *
 * usage:  node scripts/export-program-email-coverage.mjs
 * output: /tmp/program-email-coverage-YYYY-MM-DD.csv
 *
 * Columns:
 *   school_name, division, conference, state,
 *   program_email, confidence, source, source_url,
 *   last_checked_at, failure_reason, needs_manual_review
 *
 * needs_manual_review = TRUE when:
 *   - confidence is 'missing' (or NULL — never scraped), OR
 *   - confidence is 'likely' AND there's no 'verified' candidate in
 *     program_email_candidates
 *
 * The user opens the CSV in Excel/Numbers, sorts by
 * needs_manual_review DESC, and walks the list of schools that need a
 * human lookup.
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

const env = {};
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
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

const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const csvEscape = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const main = async () => {
  const { data, error } = await supabase
    .from('schools')
    .select(
      'name, division, conference, state, program_email, program_email_confidence, ' +
      'program_email_source, program_email_url, program_email_last_checked_at, ' +
      'program_email_failure_reason, program_email_candidates'
    )
    .order('division')
    .order('name');

  if (error) {
    console.error('Failed to load schools:', error.message);
    process.exit(1);
  }

  const rows = (data || []).map((s) => {
    const candidates = Array.isArray(s.program_email_candidates)
      ? s.program_email_candidates
      : [];
    const hasVerified = candidates.some((c) => c && c.confidence === 'verified');
    const needsReview =
      !s.program_email_confidence ||
      s.program_email_confidence === 'missing' ||
      (s.program_email_confidence === 'likely' && !hasVerified);

    return {
      school_name: s.name,
      division: s.division,
      conference: s.conference,
      state: s.state,
      program_email: s.program_email,
      confidence: s.program_email_confidence,
      source: s.program_email_source,
      source_url: s.program_email_url,
      last_checked_at: s.program_email_last_checked_at,
      failure_reason: s.program_email_failure_reason,
      needs_manual_review: needsReview ? 'TRUE' : 'FALSE',
    };
  });

  const header = [
    'school_name',
    'division',
    'conference',
    'state',
    'program_email',
    'confidence',
    'source',
    'source_url',
    'last_checked_at',
    'failure_reason',
    'needs_manual_review',
  ];

  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(header.map((h) => csvEscape(r[h])).join(','));
  }

  const today = new Date().toISOString().slice(0, 10);
  const outPath = `/tmp/program-email-coverage-${today}.csv`;
  writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');

  const verified = rows.filter((r) => r.confidence === 'verified').length;
  const likely = rows.filter((r) => r.confidence === 'likely').length;
  const missing = rows.filter(
    (r) => !r.confidence || r.confidence === 'missing'
  ).length;
  const needsReview = rows.filter((r) => r.needs_manual_review === 'TRUE').length;

  console.log(`Wrote ${rows.length} rows to ${outPath}`);
  console.log(`  verified: ${verified}`);
  console.log(`  likely:   ${likely}`);
  console.log(`  missing:  ${missing}`);
  console.log(`  needs_manual_review: ${needsReview}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
