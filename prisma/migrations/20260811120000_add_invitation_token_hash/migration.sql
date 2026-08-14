-- Recovered migration file. This migration was applied to the database on
-- 2026-08-12 (recorded in _prisma_migrations as
-- 20260811120000_add_invitation_token_hash, applied_steps_count=1) but its
-- migration.sql never reached git, causing `prisma migrate dev` to report
-- drift. Reconstructed on 2026-08-14 from the live DB schema
-- (information_schema.columns + pg_indexes on school_invitations) so local
-- migration history matches reality. No DDL below re-runs against the
-- database that already has these columns/indexes — this file exists so a
-- fresh database (or `prisma migrate resolve`) can reproduce the same state.

-- AlterTable
ALTER TABLE "school_invitations" ADD COLUMN     "tokenHash" TEXT,
ADD COLUMN     "sentToEmail" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "usedAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "school_invitations_tokenHash_key" ON "school_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "school_invitations_tokenHash_idx" ON "school_invitations"("tokenHash");
