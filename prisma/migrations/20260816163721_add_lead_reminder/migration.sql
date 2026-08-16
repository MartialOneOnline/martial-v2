-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LEAD_REMINDER';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "reminderAt" TIMESTAMP(3);
