/**
 * Martial App — Vonsel CSV Import Script
 *
 * Usage:
 *   node scripts/import-schools.mjs --file ./vonsel-export.csv --country UK
 *
 * CSV columns expected from Vonsel:
 *   name, address, city, phone, email, website, instagram, facebook,
 *   google_rating, google_reviews, lat, lng, categories
 *
 * Install deps first:
 *   npm install csv-parse dotenv @prisma/client --save-dev
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const CSV_FILE = getArg('--file');
const COUNTRY  = getArg('--country') || 'UK';
const DRY_RUN  = args.includes('--dry-run');

if (!CSV_FILE) {
  console.error('❌  Usage: node scripts/import-schools.mjs --file ./export.csv --country UK');
  console.error('    Add --dry-run to preview without inserting');
  process.exit(1);
}

// Load env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseRating(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : Math.min(5, Math.max(0, n));
}

function parseNumber(val) {
  const n = parseInt(val);
  return isNaN(n) ? null : n;
}

function parseFloat2(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function cleanUrl(val) {
  if (!val || val.trim() === '') return null;
  const v = val.trim();
  return v.startsWith('http') ? v : `https://${v}`;
}

function cleanInstagram(val) {
  if (!val || val.trim() === '') return null;
  return val.trim().replace(/^@/, '').replace(/https?:\/\/(www\.)?instagram\.com\/?/, '').replace(/\/$/, '');
}

// ─── MAP CSV ROW → SCHOOL ────────────────────────────────────────────────────

function mapRow(row) {
  const name = (row.name || row.Name || row.business_name || row.title || '').trim();
  if (!name) return null;

  const slug = slugify(name);
  if (!slug) return null;

  return {
    name,
    slug,
    status:        'UNVERIFIED',
    source:        'VONSEL',
    country:       COUNTRY,
    city:          (row.city || row.City || '').trim() || null,
    address:       (row.address || row.Address || row.full_address || '').trim() || null,
    phone:         (row.phone || row.Phone || row.phone_number || '').trim() || null,
    email:         (row.email || row.Email || '').trim().toLowerCase() || null,
    website:       cleanUrl(row.website || row.Website || row.site),
    instagram:     cleanInstagram(row.instagram || row.Instagram),
    facebook:      cleanUrl(row.facebook || row.Facebook),
    lat:           parseFloat2(row.lat || row.latitude),
    lng:           parseFloat2(row.lng || row.longitude),
    googleRating:  parseRating(row.google_rating || row.rating),
    googleReviews: parseNumber(row.google_reviews || row.reviews || row.reviews_count),
    photos:        [],
  };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🥋  Martial App — School Import`);
  console.log(`   File:    ${CSV_FILE}`);
  console.log(`   Country: ${COUNTRY}`);
  console.log(`   Mode:    ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'LIVE'}\n`);

  // Read CSV
  const raw = fs.readFileSync(CSV_FILE, 'utf8');
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📄  Rows in CSV: ${rows.length}`);

  // Map rows
  const schools = rows.map(mapRow).filter(Boolean);
  console.log(`✅  Valid schools: ${schools.length}`);
  console.log(`❌  Skipped (no name): ${rows.length - schools.length}\n`);

  if (DRY_RUN) {
    console.log('🔍  Preview (first 5):');
    schools.slice(0, 5).forEach(s => {
      console.log(`   - ${s.name} | ${s.city} | ${s.email || 'no email'} | ${s.phone || 'no phone'}`);
    });
    console.log('\n✅  Dry run complete. No data written.');
    return;
  }

  // Insert in batches of 50
  const BATCH = 50;
  let inserted = 0;
  let skipped  = 0;
  let errors   = 0;

  for (let i = 0; i < schools.length; i += BATCH) {
    const batch = schools.slice(i, i + BATCH);

    const { data, error } = await supabase
      .from('schools')
      .upsert(batch, {
        onConflict: 'slug',      // skip duplicates by slug
        ignoreDuplicates: true,
      })
      .select('id');

    if (error) {
      console.error(`❌  Batch ${i}-${i + BATCH} error:`, error.message);
      errors += batch.length;
    } else {
      const count = data?.length || 0;
      inserted += count;
      skipped  += batch.length - count;
      process.stdout.write(`   Batch ${Math.floor(i / BATCH) + 1}: ${count} inserted\r`);
    }
  }

  console.log(`\n\n📊  Import complete:`);
  console.log(`   ✅  Inserted: ${inserted}`);
  console.log(`   ⏭️   Skipped (duplicates): ${skipped}`);
  console.log(`   ❌  Errors: ${errors}`);
  console.log(`\n🎯  Total schools in import: ${schools.length}\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
