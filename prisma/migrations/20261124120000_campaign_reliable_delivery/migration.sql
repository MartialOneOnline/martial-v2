-- Reliable campaign delivery through Resend (lib/services/campaigns.ts,
-- lib/email/rateLimiter.ts). Additive only; safe to re-run by hand.
-- Existing rows keep their status; the new columns start empty/zero.

ALTER TYPE "CampaignRecipientStatus" ADD VALUE IF NOT EXISTS 'SENDING';
ALTER TYPE "CampaignRecipientStatus" ADD VALUE IF NOT EXISTS 'UNCERTAIN';

ALTER TABLE "campaign_recipients"
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "claimToken" TEXT,
  ADD COLUMN IF NOT EXISTS "claimedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "idempotencyGen" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastErrorCode" TEXT,
  ADD COLUMN IF NOT EXISTS "lastStatusCode" INTEGER,
  ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "uncertainSince" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "email_rate_limits" (
    "key" TEXT NOT NULL,
    "nextSlotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedUntil" TIMESTAMP(3),
    "pauseReason" TEXT,
    "pauseDetail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_rate_limits_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "campaign_recipients_status_claimedUntil_idx" ON "campaign_recipients"("status", "claimedUntil");
