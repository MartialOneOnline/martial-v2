-- CreateEnum
CREATE TYPE "ClaimRequestStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "claim_requests" (
    "id" TEXT NOT NULL,
    "status" "ClaimRequestStatus" NOT NULL DEFAULT 'PENDING',
    "schoolName" TEXT NOT NULL,
    "city" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "claim_requests_pkey" PRIMARY KEY ("id")
);
