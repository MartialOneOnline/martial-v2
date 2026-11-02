-- Free trials count from the first class (lib/services/trial.ts).
ALTER TABLE "memberships" ADD COLUMN "assignedAt" TIMESTAMP(3);
ALTER TABLE "memberships" ADD COLUMN "endDateManual" BOOLEAN NOT NULL DEFAULT false;

-- Backfill trials only (TRIAL plans and the plan-less public-page trial).
-- assignedAt: the earliest of the row's creation and its start, so imported or
-- backdated trials keep their historical assignment.
UPDATE "memberships" m
SET "assignedAt" = LEAST(m."createdAt", m."startDate")
WHERE m."planId" IN (SELECT id FROM "membership_plans" WHERE "planType" = 'TRIAL')
   OR (m."planId" IS NULL AND m."price" = 0 AND m."planName" = 'Free Trial — 1 Week');

-- endDateManual: one-time reading of existing rows — an end date that isn't
-- start + validity (± 2 h for DST) was set by hand. From now on it is recorded
-- explicitly when staff set it.
UPDATE "memberships" m
SET "endDateManual" = true
FROM "membership_plans" p
WHERE m."planId" = p.id AND p."planType" = 'TRIAL' AND m."endDate" IS NOT NULL
  AND (p."validityDays" IS NULL OR p."validityDays" <= 0
       OR ABS(EXTRACT(EPOCH FROM (m."endDate" - m."startDate")) - p."validityDays" * 86400) > 7200);

UPDATE "memberships" m
SET "endDateManual" = true
WHERE m."planId" IS NULL AND m."price" = 0 AND m."planName" = 'Free Trial — 1 Week' AND m."endDate" IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (m."endDate" - m."startDate")) - 7 * 86400) > 7200;
