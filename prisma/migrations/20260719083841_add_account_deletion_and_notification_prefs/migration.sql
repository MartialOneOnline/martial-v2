-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "notifyBookingConfirmed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyClassReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyMembershipUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyPromotions" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3);
