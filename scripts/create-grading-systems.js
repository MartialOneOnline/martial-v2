// Creates grading_systems and belt_ranks tables in Supabase.
// Run: SUPABASE_SECRET_KEY=... node scripts/create-grading-systems.js
//
// Safe to run multiple times (uses IF NOT EXISTS).

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://slxqkvdwtbmxosjriwfe.supabase.co',
  process.env.SUPABASE_SECRET_KEY
)

async function run() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- GradingSystem table
      CREATE TABLE IF NOT EXISTS grading_systems (
        id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "schoolId"          TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name                TEXT NOT NULL,
        activity            TEXT,
        "isDefault"         BOOLEAN NOT NULL DEFAULT false,
        "isActive"          BOOLEAN NOT NULL DEFAULT true,
        "requireApproval"   BOOLEAN NOT NULL DEFAULT true,
        "gradingFee"        INTEGER NOT NULL DEFAULT 0,
        "notifyStudent"     BOOLEAN NOT NULL DEFAULT true,
        "notifyInstructor"  BOOLEAN NOT NULL DEFAULT true,
        "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- BeltRank table
      CREATE TABLE IF NOT EXISTS belt_ranks (
        id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "systemId"              TEXT NOT NULL REFERENCES grading_systems(id) ON DELETE CASCADE,
        "order"                 INTEGER NOT NULL DEFAULT 0,
        name                    TEXT NOT NULL,
        color                   TEXT NOT NULL DEFAULT '#9CA3AF',
        "maxDegrees"            INTEGER NOT NULL DEFAULT 0,
        "minAge"                INTEGER,
        "minMonthsAtPrevious"   INTEGER,
        "totalClassesRequired"  INTEGER,
        "classesPerPeriod"      INTEGER,
        "periodType"            TEXT,
        "classTypeIds"          TEXT[] NOT NULL DEFAULT '{}',
        "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_grading_systems_school ON grading_systems("schoolId");
      CREATE INDEX IF NOT EXISTS idx_belt_ranks_system ON belt_ranks("systemId", "order");
    `
  })

  if (error) {
    // Try direct SQL if RPC not available
    console.error('RPC error (expected if exec_sql not set up):', error.message)
    console.log('\nRun this SQL manually in Supabase SQL editor:\n')
    console.log(`
CREATE TABLE IF NOT EXISTS grading_systems (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "schoolId"          TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  activity            TEXT,
  "isDefault"         BOOLEAN NOT NULL DEFAULT false,
  "isActive"          BOOLEAN NOT NULL DEFAULT true,
  "requireApproval"   BOOLEAN NOT NULL DEFAULT true,
  "gradingFee"        INTEGER NOT NULL DEFAULT 0,
  "notifyStudent"     BOOLEAN NOT NULL DEFAULT true,
  "notifyInstructor"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS belt_ranks (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "systemId"              TEXT NOT NULL REFERENCES grading_systems(id) ON DELETE CASCADE,
  "order"                 INTEGER NOT NULL DEFAULT 0,
  name                    TEXT NOT NULL,
  color                   TEXT NOT NULL DEFAULT '#9CA3AF',
  "maxDegrees"            INTEGER NOT NULL DEFAULT 0,
  "minAge"                INTEGER,
  "minMonthsAtPrevious"   INTEGER,
  "totalClassesRequired"  INTEGER,
  "classesPerPeriod"      INTEGER,
  "periodType"            TEXT,
  "classTypeIds"          TEXT[] NOT NULL DEFAULT '{}',
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grading_systems_school ON grading_systems("schoolId");
CREATE INDEX IF NOT EXISTS idx_belt_ranks_system ON belt_ranks("systemId", "order");
    `)
    return
  }

  console.log('✓ Tables created successfully')
}

run()
