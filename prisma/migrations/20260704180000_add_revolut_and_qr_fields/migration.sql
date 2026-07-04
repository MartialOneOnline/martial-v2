-- AlterEnum
ALTER TYPE "public"."PaymentMethod" ADD VALUE 'REVOLUT';

-- AlterTable
ALTER TABLE "public"."schools" ADD COLUMN     "revolutPublicKey" TEXT,
ADD COLUMN     "revolutSecretKey" TEXT;

-- AlterTable
ALTER TABLE "public"."memberships" ADD COLUMN     "revolutOrderId" TEXT;

-- AlterTable
ALTER TABLE "public"."event_bookings" ADD COLUMN     "checkedIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "qrToken" TEXT,
ADD COLUMN     "revolutOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "event_bookings_qrToken_key" ON "public"."event_bookings"("qrToken");
