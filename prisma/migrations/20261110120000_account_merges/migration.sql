-- Audit log + per-user claims for the admin "Merge accounts" tool (lib/accountMerge.ts).
-- Additive only; safe to re-run by hand.
CREATE TABLE IF NOT EXISTS "account_merges" (
    "id" TEXT NOT NULL,
    "keptUserId" TEXT NOT NULL,
    "mergedUserId" TEXT NOT NULL,
    "mergedEmail" TEXT NOT NULL,
    "mergedName" TEXT,
    "actorId" TEXT,
    "keptAuthId" UUID,
    "disabledAuth" JSONB NOT NULL,
    "moved" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_merges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "account_merges_keptUserId_idx" ON "account_merges"("keptUserId");
CREATE INDEX IF NOT EXISTS "account_merges_mergedUserId_idx" ON "account_merges"("mergedUserId");

-- Per-user claim while a merge runs or settles after an uncertain Auth write.
CREATE TABLE IF NOT EXISTS "account_merge_claims" (
    "userId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "holdUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_merge_claims_pkey" PRIMARY KEY ("userId")
);
