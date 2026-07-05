-- CreateTable
CREATE TABLE "impersonation_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetEmail" TEXT,
    "schoolId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impersonation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "impersonation_logs_actorId_idx" ON "impersonation_logs"("actorId");

-- CreateIndex
CREATE INDEX "impersonation_logs_targetUserId_idx" ON "impersonation_logs"("targetUserId");

-- CreateIndex
CREATE INDEX "impersonation_logs_schoolId_idx" ON "impersonation_logs"("schoolId");

-- CreateIndex
CREATE INDEX "impersonation_logs_createdAt_idx" ON "impersonation_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "impersonation_logs" ADD CONSTRAINT "impersonation_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_logs" ADD CONSTRAINT "impersonation_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_logs" ADD CONSTRAINT "impersonation_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
