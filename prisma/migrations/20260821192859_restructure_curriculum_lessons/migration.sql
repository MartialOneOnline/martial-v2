/*
  Warnings:

  - You are about to drop the `curriculum_video_views` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `curriculum_videos` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CurriculumLessonStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'ERRORED');

-- DropForeignKey
ALTER TABLE "curriculum_video_views" DROP CONSTRAINT "curriculum_video_views_userId_fkey";

-- DropForeignKey
ALTER TABLE "curriculum_video_views" DROP CONSTRAINT "curriculum_video_views_videoId_fkey";

-- DropForeignKey
ALTER TABLE "curriculum_videos" DROP CONSTRAINT "curriculum_videos_createdById_fkey";

-- DropForeignKey
ALTER TABLE "curriculum_videos" DROP CONSTRAINT "curriculum_videos_schoolId_fkey";

-- DropTable
DROP TABLE "curriculum_video_views";

-- DropTable
DROP TABLE "curriculum_videos";

-- DropEnum
DROP TYPE "CurriculumVideoStatus";

-- CreateTable
CREATE TABLE "curriculums" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_lessons" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "CurriculumLessonStatus" NOT NULL DEFAULT 'UPLOADING',
    "muxUploadId" TEXT,
    "muxAssetId" TEXT,
    "muxPlaybackId" TEXT,
    "durationSec" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_lesson_views" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 1,
    "firstViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_lesson_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "curriculums_schoolId_idx" ON "curriculums"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_lessons_muxUploadId_key" ON "curriculum_lessons"("muxUploadId");

-- CreateIndex
CREATE INDEX "curriculum_lessons_curriculumId_idx" ON "curriculum_lessons"("curriculumId");

-- CreateIndex
CREATE INDEX "curriculum_lessons_schoolId_idx" ON "curriculum_lessons"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_lesson_views_lessonId_userId_key" ON "curriculum_lesson_views"("lessonId", "userId");

-- AddForeignKey
ALTER TABLE "curriculums" ADD CONSTRAINT "curriculums_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_lessons" ADD CONSTRAINT "curriculum_lessons_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curriculums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_lessons" ADD CONSTRAINT "curriculum_lessons_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_lessons" ADD CONSTRAINT "curriculum_lessons_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_lesson_views" ADD CONSTRAINT "curriculum_lesson_views_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "curriculum_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_lesson_views" ADD CONSTRAINT "curriculum_lesson_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
