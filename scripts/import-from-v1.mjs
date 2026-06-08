/**
 * Martial App V2 — Import from V1 Laravel MySQL Database
 *
 * Connects directly to V1 MySQL, reads schools, maps fields, inserts into V2 Supabase.
 *
 * Usage:
 *   node scripts/import-from-v1.mjs \
 *     --host db.martialapp.com \
 *     --port 3306 \
 *     --db martial_v1 \
 *     --user root \
 *     --password secret \
 *     --table schools \
 *     --dry-run
 *
 * Remove --dry-run to write to Supabase.
 *
 * Install deps first (one-time):
 *   npm install mysql2 dotenv @supabase/supabase-js --save-dev
 */

import mysql from 'mysql2/promise';
import fs    from 'fs';
import path  from 'path';

// ─── ARGS ────────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const getArg  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const hasFlag = (flag) => args.includes(flag);

const V1_HOST     = getArg('--host')     || 'localhost';
const V1_PORT     = parseInt(getArg('--port') || '3306');
const V1_DB       = getArg('--db')       || 'martial_v1';
const V1_USER     = getArg('--user')     || 'root';
const V1_PASSWORD = getArg('--password') || '';
const V1_TABLE    = getArg('--table')    || 'schools';   // or 'academies', 'dojos'
const DRY_RUN     = hasFlag('--dry-run');
const SHOW_SCHEMA = hasFlag('--show-schema');  // Just print V1 table columns then exit
const LIMIT       = parseInt(getArg('--limit') || '0'); // 0 = no limit

// ─── LOAD ENV ────────────────────────────────────────────────────────────────

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function slugify(text) {
  return String(text || '')
    .toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove accents
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanPhone(val) {
  if (!val) return null;
  const s = String(val).trim().replace(/\s+/g, '');
  return s || null;
}

function cleanUrl(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  return s.startsWith('http') ? s : `https://${s}`;
}

function cleanInstagram(val) {
  if (!val) return null;
  return String(val).trim()
    .replace(/^@/, '')
    .replace(/https?:\/\/(www\.)?instagram\.com\/?/, '')
    .replace(/\/$/, '') || null;
}

function parseRating(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : Math.min(5, Math.max(0, Math.round(n * 10) / 10));
}

function parseIntSafe(val) {
  const n = parseInt(val);
  return isNaN(n) ? null : n;
}

function parseFloatSafe(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function parsePhotos(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  try { const p = JSON.parse(val); return Array.isArray(p) ? p.filter(Boolean) : []; }
  catch { return val.split(',').map(s => s.trim()).filter(Boolean); }
}

function parseDisciplines(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; }
  catch { return String(val).split(/[,;|]/).map(s => s.trim()).filter(Boolean); }
}

// ─── V1 → V2 FIELD MAPPING ───────────────────────────────────────────────────
// Adjust the left-hand keys to match your actual V1 column names.
// The right-hand side is the V2 Supabase column.

function mapV1toV2(row, country = 'ES') {

  // ── Core identity ──────────────────────────────────────────────────────────
  const name = String(
    row.name || row.school_name || row.academy_name || row.title || row.business_name || ''
  ).trim();

  if (!name) return null; // skip rows with no name

  const slug = slugify(name);
  if (!slug) return null;

  // ── Location ───────────────────────────────────────────────────────────────
  const city    = String(row.city    || row.town   || row.location || '').trim() || null;
  const address = String(row.address || row.street || row.full_address || '').trim() || null;
  const postcode= String(row.postcode|| row.zip    || row.postal_code || '').trim() || null;
  const lat     = parseFloatSafe(row.lat || row.latitude);
  const lng     = parseFloatSafe(row.lng || row.longitude);
  const countryCode = String(row.country || row.country_code || country).trim().toUpperCase();

  // ── Contact ────────────────────────────────────────────────────────────────
  const phone   = cleanPhone(row.phone || row.phone_number || row.tel || row.mobile);
  const email   = String(row.email || row.contact_email || '').trim().toLowerCase() || null;
  const website = cleanUrl(row.website || row.site || row.web || row.url);

  // ── Social ─────────────────────────────────────────────────────────────────
  const instagram = cleanInstagram(row.instagram || row.instagram_url);
  const facebook  = cleanUrl(row.facebook || row.facebook_url);
  const youtube   = cleanUrl(row.youtube  || row.youtube_url);
  const tiktok    = cleanInstagram(row.tiktok || row.tiktok_url);

  // ── Profile ────────────────────────────────────────────────────────────────
  const description = String(row.description || row.about || row.bio || row.summary || '').trim() || null;
  const logoUrl     = row.logo_url || row.logo || row.avatar || null;
  const coverUrl    = row.cover_url || row.cover || row.banner || row.image || null;
  const photos      = parsePhotos(row.photos || row.images || row.gallery);

  // ── Google data ────────────────────────────────────────────────────────────
  const googleRating   = parseRating(row.google_rating || row.rating || row.stars);
  const googleReviews  = parseIntSafe(row.google_reviews || row.reviews_count || row.total_reviews);
  const googlePlaceId  = String(row.google_place_id || row.place_id || '').trim() || null;

  // ── Status ─────────────────────────────────────────────────────────────────
  // If V1 has verified/active flags, map them here
  let status = 'UNVERIFIED';
  if (row.verified == 1 || row.verified === true || row.status === 'verified')   status = 'VERIFIED';
  if (row.claimed  == 1 || row.claimed  === true || row.status === 'claimed')    status = 'CLAIMED';
  if (row.suspended== 1 || row.suspended=== true || row.status === 'suspended') status = 'SUSPENDED';

  return {
    // Required
    name,
    slug,
    status,
    source: 'VONSEL',   // or 'MANUAL' if these are manually curated

    // Location
    country: countryCode,
    city,
    address,
    postcode,
    lat,
    lng,

    // Contact
    phone,
    email,
    website,

    // Social
    instagram,
    facebook,
    youtube,
    tiktok,

    // Profile
    description,
    logoUrl,
    coverUrl,
    photos,

    // Google
    googleRating,
    googleReviews,
    googlePlaceId,

    // Disciplines (stored separately — we'll handle after)
    _disciplines: parseDisciplines(row.disciplines || row.categories || row.sports || row.activities),
  };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🥋  Martial App V2 — Import from V1 MySQL');
  console.log('─'.repeat(50));
  console.log(`   V1 Host:  ${V1_HOST}:${V1_PORT}`);
  console.log(`   V1 DB:    ${V1_DB}`);
  console.log(`   V1 Table: ${V1_TABLE}`);
  console.log(`   Mode:     ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '🚀 LIVE'}`);
  console.log('─'.repeat(50) + '\n');

  // ── Connect to V1 MySQL ────────────────────────────────────────────────────
  let v1;
  try {
    v1 = await mysql.createConnection({
      host:     V1_HOST,
      port:     V1_PORT,
      database: V1_DB,
      user:     V1_USER,
      password: V1_PASSWORD,
      ssl:      V1_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined,
    });
    console.log(`✅  Connected to V1 MySQL: ${V1_HOST}/${V1_DB}`);
  } catch (err) {
    console.error(`❌  Cannot connect to V1 MySQL: ${err.message}`);
    console.error('    Check --host, --port, --db, --user, --password');
    process.exit(1);
  }

  // ── Show schema mode ───────────────────────────────────────────────────────
  if (SHOW_SCHEMA) {
    console.log('\n📋  Showing V1 database structure...\n');

    const [tables] = await v1.query('SHOW TABLES');
    console.log('Tables found:');
    tables.forEach(t => console.log('  -', Object.values(t)[0]));

    console.log(`\nColumns in \`${V1_TABLE}\`:`);
    const [cols] = await v1.query(`DESCRIBE \`${V1_TABLE}\``);
    cols.forEach(c => console.log(`  ${c.Field.padEnd(30)} ${c.Type.padEnd(20)} ${c.Null === 'YES' ? 'nullable' : 'required'}`));

    const [count] = await v1.query(`SELECT COUNT(*) as total FROM \`${V1_TABLE}\``);
    console.log(`\nTotal rows: ${count[0].total}`);
    console.log('\n💡  Adjust the mapV1toV2() function in this script to match your columns.');

    await v1.end();
    return;
  }

  // ── Fetch rows from V1 ─────────────────────────────────────────────────────
  const limitClause = LIMIT > 0 ? ` LIMIT ${LIMIT}` : '';
  const [rows] = await v1.query(`SELECT * FROM \`${V1_TABLE}\`${limitClause}`);
  await v1.end();

  console.log(`📄  Rows fetched from V1: ${rows.length}\n`);

  // ── Map rows ───────────────────────────────────────────────────────────────
  const mapped   = rows.map(r => mapV1toV2(r)).filter(Boolean);
  const skippedMap = rows.length - mapped.length;

  console.log(`✅  Valid schools mapped: ${mapped.length}`);
  if (skippedMap > 0) console.log(`⚠️   Skipped (no name): ${skippedMap}`);

  // ── Preview (dry run) ──────────────────────────────────────────────────────
  if (DRY_RUN) {
    console.log('\n🔍  Preview — first 10 schools:\n');
    mapped.slice(0, 10).forEach((s, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${s.name}`);
      console.log(`      Slug:      ${s.slug}`);
      console.log(`      Location:  ${[s.city, s.country].filter(Boolean).join(', ')}`);
      console.log(`      Contact:   ${s.email || 'no email'} | ${s.phone || 'no phone'}`);
      console.log(`      Rating:    ${s.googleRating || '-'} (${s.googleReviews || 0} reviews)`);
      console.log(`      Status:    ${s.status}`);
      if (s._disciplines.length) console.log(`      Disciplines: ${s._disciplines.join(', ')}`);
      console.log();
    });

    // Stats
    const withEmail    = mapped.filter(s => s.email).length;
    const withPhone    = mapped.filter(s => s.phone).length;
    const withCoords   = mapped.filter(s => s.lat && s.lng).length;
    const withRating   = mapped.filter(s => s.googleRating).length;
    const withPhotos   = mapped.filter(s => s.photos.length > 0).length;
    const withDisc     = mapped.filter(s => s._disciplines.length > 0).length;

    console.log('📊  Data quality stats:');
    console.log(`   Email:       ${withEmail}/${mapped.length} (${pct(withEmail, mapped.length)}%)`);
    console.log(`   Phone:       ${withPhone}/${mapped.length} (${pct(withPhone, mapped.length)}%)`);
    console.log(`   Coordinates: ${withCoords}/${mapped.length} (${pct(withCoords, mapped.length)}%)`);
    console.log(`   Rating:      ${withRating}/${mapped.length} (${pct(withRating, mapped.length)}%)`);
    console.log(`   Photos:      ${withPhotos}/${mapped.length} (${pct(withPhotos, mapped.length)}%)`);
    console.log(`   Disciplines: ${withDisc}/${mapped.length} (${pct(withDisc, mapped.length)}%)`);
    console.log('\n✅  Dry run complete. Run without --dry-run to import.\n');
    return;
  }

  // ── Connect to Supabase V2 ─────────────────────────────────────────────────
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✅  Connected to Supabase V2\n');

  // ── Insert schools in batches ──────────────────────────────────────────────
  const BATCH_SIZE = 50;
  let inserted = 0;
  let skipped  = 0;
  let errors   = 0;

  // Strip _disciplines before inserting (handled separately)
  const schoolsToInsert = mapped.map(({ _disciplines, ...s }) => s);

  for (let i = 0; i < schoolsToInsert.length; i += BATCH_SIZE) {
    const batch = schoolsToInsert.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('schools')
      .upsert(batch, { onConflict: 'slug', ignoreDuplicates: true })
      .select('id, slug');

    if (error) {
      console.error(`❌  Batch error (rows ${i}–${i + BATCH_SIZE}): ${error.message}`);
      errors += batch.length;
    } else {
      inserted += data?.length || 0;
      skipped  += batch.length - (data?.length || 0);
    }

    const pctDone = Math.round(((i + batch.length) / schoolsToInsert.length) * 100);
    process.stdout.write(`   Progress: ${pctDone}% (${i + batch.length}/${schoolsToInsert.length})\r`);
  }

  // ── Insert disciplines ─────────────────────────────────────────────────────
  // First ensure disciplines exist in the disciplines table,
  // then create school_disciplines links.
  const allDisciplines = [...new Set(mapped.flatMap(s => s._disciplines))].filter(Boolean);

  if (allDisciplines.length > 0) {
    console.log(`\n\n🥊  Syncing ${allDisciplines.length} disciplines...`);

    for (const name of allDisciplines) {
      const dSlug = slugify(name);
      await supabase.from('disciplines').upsert({ name, slug: dSlug }, { onConflict: 'slug', ignoreDuplicates: true });
    }

    // Get all discipline IDs
    const { data: discRows } = await supabase.from('disciplines').select('id, slug');
    const discMap = Object.fromEntries((discRows || []).map(d => [d.slug, d.id]));

    // Get all school IDs for our slugs
    const slugs = mapped.filter(s => s._disciplines.length > 0).map(s => s.slug);
    const { data: schoolRows } = await supabase.from('schools').select('id, slug').in('slug', slugs);
    const schoolMap = Object.fromEntries((schoolRows || []).map(s => [s.slug, s.id]));

    // Build school_disciplines links
    const links = mapped.flatMap(s =>
      s._disciplines
        .map(d => ({
          schoolId:     schoolMap[s.slug],
          disciplineId: discMap[slugify(d)],
        }))
        .filter(l => l.schoolId && l.disciplineId)
    );

    if (links.length > 0) {
      const { error: linkErr } = await supabase
        .from('school_disciplines')
        .upsert(links, { onConflict: 'schoolId,disciplineId', ignoreDuplicates: true });

      if (linkErr) console.error('⚠️   Discipline links error:', linkErr.message);
      else console.log(`✅  Discipline links created: ${links.length}`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n\n' + '─'.repeat(50));
  console.log('📊  Import complete:');
  console.log(`   ✅  Inserted:           ${inserted}`);
  console.log(`   ⏭️   Skipped (duplicate): ${skipped}`);
  console.log(`   ❌  Errors:             ${errors}`);
  console.log(`   📍  Total processed:    ${mapped.length}`);
  console.log('─'.repeat(50) + '\n');
}

function pct(n, total) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

main().catch(err => {
  console.error('\n💥  Fatal error:', err.message);
  process.exit(1);
});
