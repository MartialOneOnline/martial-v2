-- Manual-review resolution metadata for FLAGGED transactions — lets an
-- admin mark one handled (refunded externally, member reactivated
-- manually, etc.) without deleting the row or changing its status. See
-- recordFlaggedPayment in apps/web/lib/services/transactions.ts for how
-- FLAGGED rows are created, and PATCH /api/dashboard/transactions/[id]
-- (action: "resolve") for how these fields get set.
ALTER TABLE "transactions" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "transactions" ADD COLUMN "resolvedBy" TEXT;
ALTER TABLE "transactions" ADD COLUMN "resolutionNote" TEXT;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_resolvedBy_fkey"
  FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
