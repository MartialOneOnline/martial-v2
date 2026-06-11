-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'DEMO', 'INVITE_SENT', 'ONBOARDING', 'WON', 'LOST', 'REJECTED');

-- CreateEnum
CREATE TYPE "SchoolRelationshipType" AS ENUM ('HQ_BRANCH', 'FRANCHISE', 'AFFILIATE_SCHOOL', 'PARTNER', 'NETWORK_MEMBER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SchoolMemberRole" ADD VALUE 'ADMIN';
ALTER TYPE "SchoolMemberRole" ADD VALUE 'MANAGER';
ALTER TYPE "SchoolMemberRole" ADD VALUE 'ASSISTANT_INSTRUCTOR';
ALTER TYPE "SchoolMemberRole" ADD VALUE 'RECEPTIONIST';

-- DropIndex
DROP INDEX "school_invitations_schoolId_key";

-- AlterTable
ALTER TABLE "school_invitations" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "leadStage" "LeadStage",
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "parentRelationshipType" "SchoolRelationshipType";

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSchoolId" TEXT,
    "lastContextType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "school_invitations_schoolId_isActive_idx" ON "school_invitations"("schoolId", "isActive");

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
