-- Adds FLAGGED to TransactionStatus: a payment the provider already
-- captured but that was deliberately not turned into an active membership
-- (e.g. the SchoolMember was ARCHIVED between checkout and webhook
-- delivery). This is the persistent, admin-visible "requires manual
-- review" marker — see recordFlaggedPayment in
-- apps/web/lib/services/transactions.ts.
ALTER TYPE "TransactionStatus" ADD VALUE 'FLAGGED';
