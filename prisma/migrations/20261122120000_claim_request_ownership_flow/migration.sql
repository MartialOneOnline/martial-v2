-- Ownership-request flow (claim requests → linked school → invitation → accepted owner).
-- Additive only: new enum values, nullable columns, one new table. Existing rows keep
-- their status; legacy RESOLVED rows stay RESOLVED (shown as "association not reviewed").
-- NOT applied — requires explicit authorization (docs/PROJECT-AUDIT.md, Lote AD).
-- CreateEnum
CREATE TYPE "InvitationDeliveryStatus" AS ENUM ('PREPARED', 'SENDING', 'ACCEPTED', 'FAILED', 'UNCERTAIN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClaimRequestStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "ClaimRequestStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "school_invitations" ADD COLUMN     "acceptedUserId" TEXT,
ADD COLUMN     "claimRequestId" TEXT,
ADD COLUMN     "deliveryAttempt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryError" TEXT,
ADD COLUMN     "deliveryKeyAt" TIMESTAMP(3),
ADD COLUMN     "deliveryPayload" JSONB,
ADD COLUMN     "deliveryStartedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryStatus" "InvitationDeliveryStatus",
ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "tokenNonce" TEXT;

-- AlterTable
ALTER TABLE "claim_requests" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedUserId" TEXT,
ADD COLUMN     "linkedAt" TIMESTAMP(3),
ADD COLUMN     "linkedById" TEXT,
ADD COLUMN     "locale" TEXT,
ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "schoolId" TEXT,
ADD COLUMN     "sourceSchoolId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "claim_request_events" (
    "id" TEXT NOT NULL,
    "claimRequestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_request_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "claim_request_events_claimRequestId_createdAt_idx" ON "claim_request_events"("claimRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "school_invitations_claimRequestId_idx" ON "school_invitations"("claimRequestId");

-- CreateIndex
CREATE INDEX "claim_requests_status_createdAt_idx" ON "claim_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "claim_requests_schoolId_idx" ON "claim_requests"("schoolId");

-- AddForeignKey
ALTER TABLE "school_invitations" ADD CONSTRAINT "school_invitations_claimRequestId_fkey" FOREIGN KEY ("claimRequestId") REFERENCES "claim_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_requests" ADD CONSTRAINT "claim_requests_sourceSchoolId_fkey" FOREIGN KEY ("sourceSchoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_requests" ADD CONSTRAINT "claim_requests_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_request_events" ADD CONSTRAINT "claim_request_events_claimRequestId_fkey" FOREIGN KEY ("claimRequestId") REFERENCES "claim_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

