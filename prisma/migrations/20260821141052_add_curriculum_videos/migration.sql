-- CreateEnum
CREATE TYPE "CurriculumVideoStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'ERRORED');

-- CreateTable
CREATE TABLE "curriculum_videos" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "belt" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "CurriculumVideoStatus" NOT NULL DEFAULT 'UPLOADING',
    "muxUploadId" TEXT,
    "muxAssetId" TEXT,
    "muxPlaybackId" TEXT,
    "durationSec" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_videos_muxUploadId_key" ON "curriculum_videos"("muxUploadId");

-- CreateIndex
CREATE INDEX "curriculum_videos_schoolId_belt_idx" ON "curriculum_videos"("schoolId", "belt");

-- AddForeignKey
ALTER TABLE "curriculum_videos" ADD CONSTRAINT "curriculum_videos_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_videos" ADD CONSTRAINT "curriculum_videos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
