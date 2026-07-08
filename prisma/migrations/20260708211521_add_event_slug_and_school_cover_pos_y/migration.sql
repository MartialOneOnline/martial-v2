-- AlterTable
ALTER TABLE "events" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "coverPosY" DOUBLE PRECISION NOT NULL DEFAULT 50;

-- CreateIndex
CREATE UNIQUE INDEX "events_schoolId_slug_key" ON "events"("schoolId", "slug");
