-- CreateEnum
CREATE TYPE "MembershipPaymentStatus" AS ENUM ('TRIALING', 'ACTIVE', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'PAST_DUE', 'UNPAID', 'PAUSED', 'CANCELED');

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "paymentStatus" "MembershipPaymentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "paymentStatusAt" TIMESTAMP(3);
