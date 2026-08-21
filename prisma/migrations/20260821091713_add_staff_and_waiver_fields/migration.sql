-- AlterTable
ALTER TABLE "instructors" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "salary" DOUBLE PRECISION,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_waivers" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "signedAt" DROP NOT NULL,
ALTER COLUMN "signedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "waivers_schoolId_title_key" ON "waivers"("schoolId", "title");
