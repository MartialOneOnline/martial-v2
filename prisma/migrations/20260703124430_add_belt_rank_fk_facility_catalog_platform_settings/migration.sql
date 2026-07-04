-- AlterTable
ALTER TABLE "gradings" ADD COLUMN     "fromBeltRankId" TEXT,
ADD COLUMN     "toBeltRankId" TEXT;

-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN     "allowSelfRegistration" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailSenderName" TEXT NOT NULL DEFAULT 'Martial',
ADD COLUMN     "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyNewSchool" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyVerificationReq" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyWeeklyReport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireEmailVerification" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "superAdminEmail" TEXT DEFAULT 'admin@martial.app',
ADD COLUMN     "supportEmail" TEXT DEFAULT 'hello@martial.app';

-- AlterTable
ALTER TABLE "school_members" ADD COLUMN     "beltRankId" TEXT;

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_facilities" (
    "schoolId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,

    CONSTRAINT "school_facilities_pkey" PRIMARY KEY ("schoolId","facilityId")
);

-- CreateIndex
CREATE UNIQUE INDEX "facilities_name_key" ON "facilities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_slug_key" ON "facilities"("slug");

-- AddForeignKey
ALTER TABLE "school_facilities" ADD CONSTRAINT "school_facilities_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_facilities" ADD CONSTRAINT "school_facilities_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_members" ADD CONSTRAINT "school_members_beltRankId_fkey" FOREIGN KEY ("beltRankId") REFERENCES "belt_ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gradings" ADD CONSTRAINT "gradings_fromBeltRankId_fkey" FOREIGN KEY ("fromBeltRankId") REFERENCES "belt_ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gradings" ADD CONSTRAINT "gradings_toBeltRankId_fkey" FOREIGN KEY ("toBeltRankId") REFERENCES "belt_ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
