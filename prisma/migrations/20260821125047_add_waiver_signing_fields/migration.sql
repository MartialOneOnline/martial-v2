-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'WAIVER_SIGNED';

-- AlterTable
ALTER TABLE "user_waivers" ADD COLUMN     "contentSnapshot" TEXT,
ADD COLUMN     "pdfPath" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "sentVia" TEXT NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "signedVersion" TEXT,
ADD COLUMN     "userAgent" TEXT;
