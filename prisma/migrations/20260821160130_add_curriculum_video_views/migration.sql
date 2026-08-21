-- CreateTable
CREATE TABLE "curriculum_video_views" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 1,
    "firstViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_video_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_video_views_videoId_userId_key" ON "curriculum_video_views"("videoId", "userId");

-- AddForeignKey
ALTER TABLE "curriculum_video_views" ADD CONSTRAINT "curriculum_video_views_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "curriculum_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_video_views" ADD CONSTRAINT "curriculum_video_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
