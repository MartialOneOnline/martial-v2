-- Resync migration history with the actual dev database schema.
--
-- The migrations recorded before this one no longer match the live dev DB:
-- schema changes were applied out-of-band (via `db push` or manual SQL)
-- without a corresponding migration file being committed. This migration
-- captures that delta so `prisma migrate dev` can replay history accurately
-- again. It is marked as already-applied via `prisma migrate resolve
-- --applied` rather than executed, since the underlying changes already
-- exist on the database.
--
-- Includes: login_history, platform_settings, school_subscriptions,
-- stripe_webhook_events tables and the SchoolSubscriptionStatus /
-- StripeWebhookEventStatus enums. These exist on the live DB but are
-- intentionally NOT modeled in schema.prisma (no Prisma models, unused by
-- app code) -- left as known, untracked drift per team decision. They are
-- included here only so migration history reflects the true DB state.

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('NEW_LEAD', 'NEW_MEMBER', 'PAYMENT_RECEIVED', 'PAYMENT_PENDING', 'MEMBERSHIP_REQUEST', 'MEMBERSHIP_EXPIRING', 'CLASS_FULL', 'CLASS_CANCELLED', 'GRADING_COMPLETED', 'STUDENT_INACTIVE', 'MESSAGE');

-- CreateEnum
CREATE TYPE "public"."SchoolSubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'PAST_DUE', 'UNPAID', 'PAUSED', 'CANCELED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."SchoolType" AS ENUM ('SCHOOL', 'CAMP', 'BUSINESS');

-- CreateEnum
CREATE TYPE "public"."StripeWebhookEventStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PAID', 'PENDING', 'FAILED', 'REFUNDED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "public"."MembershipStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "public"."classes" ADD COLUMN     "bookingSettings" JSONB,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMethods" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "public"."events" DROP COLUMN "currency",
DROP COLUMN "price",
ADD COLUMN     "paymentMethods" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "public"."membership_plans" DROP COLUMN "classLimit",
DROP COLUMN "features",
ADD COLUMN     "classAccess" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paymentMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "planType" TEXT NOT NULL DEFAULT 'SUBSCRIPTION',
ADD COLUMN     "validityDays" INTEGER,
ALTER COLUMN "price" SET DEFAULT 0,
ALTER COLUMN "billingCycle" SET DEFAULT 'monthly';

-- AlterTable
ALTER TABLE "public"."memberships" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "renewedFromId" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeInvoiceId" TEXT;

-- AlterTable
ALTER TABLE "public"."schools" DROP COLUMN "stripeAccountId",
ADD COLUMN     "cancelPolicy" TEXT NOT NULL DEFAULT 'IMMEDIATE',
ADD COLUMN     "defaultBookingSettings" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "stripePublishableKey" TEXT,
ADD COLUMN     "stripeSecretKey" TEXT,
ADD COLUMN     "stripeWebhookSecret" TEXT,
ADD COLUMN     "type" "public"."SchoolType" NOT NULL DEFAULT 'SCHOOL',
ADD COLUMN     "v1UserId" INTEGER;

-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "paymentMethod" "public"."PaymentMethod",
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ADD COLUMN     "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PAID';

-- CreateTable
CREATE TABLE "public"."belt_ranks" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#9CA3AF',
    "maxDegrees" INTEGER NOT NULL DEFAULT 0,
    "minAge" INTEGER,
    "minMonthsAtPrevious" INTEGER,
    "totalClassesRequired" INTEGER,
    "classesPerPeriod" INTEGER,
    "periodType" TEXT,
    "classTypeIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requireCompetition" BOOLEAN NOT NULL DEFAULT false,
    "requireExam" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "belt_ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_tickets" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "capacity" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."grading_systems" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activity" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "gradingFee" INTEGER NOT NULL DEFAULT 0,
    "notifyStudent" BOOLEAN NOT NULL DEFAULT true,
    "notifyInstructor" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."login_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "userName" TEXT,
    "userRole" "public"."Role",
    "ipAddress" TEXT,
    "country" TEXT,
    "city" TEXT,
    "userAgent" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabledPaymentMethods" TEXT[] DEFAULT ARRAY['STRIPE', 'CASH', 'BANK_TRANSFER', 'DIRECT_DEBIT', 'PAYPAL', 'OTHER']::TEXT[],
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "defaultTaxName" TEXT,
    "defaultTaxRate" DOUBLE PRECISION,
    "defaultTaxNumber" TEXT,
    "taxActive" BOOLEAN NOT NULL DEFAULT false,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "planCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "planPriceMonthly" INTEGER,
    "planPriceQuarterly" INTEGER,
    "planPriceAnnual" INTEGER,
    "stripePriceIdMonthly" TEXT,
    "stripePriceIdQuarterly" TEXT,
    "stripePriceIdAnnual" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."school_subscriptions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "billingCycle" TEXT,
    "status" "public"."SchoolSubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "public"."StripeWebhookEventStatus" NOT NULL DEFAULT 'PROCESSING',
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_history_createdAt_idx" ON "public"."login_history"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "login_history_userEmail_idx" ON "public"."login_history"("userEmail" ASC);

-- CreateIndex
CREATE INDEX "login_history_userId_idx" ON "public"."login_history"("userId" ASC);

-- CreateIndex
CREATE INDEX "login_history_userId_ipAddress_createdAt_idx" ON "public"."login_history"("userId" ASC, "ipAddress" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "notifications_schoolId_createdAt_idx" ON "public"."notifications"("schoolId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "notifications_schoolId_read_idx" ON "public"."notifications"("schoolId" ASC, "read" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "school_subscriptions_schoolId_key" ON "public"."school_subscriptions"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_events_eventId_key" ON "public"."stripe_webhook_events"("eventId" ASC);

-- CreateIndex
CREATE INDEX "bookings_classId_scheduledAt_idx" ON "public"."bookings"("classId" ASC, "scheduledAt" ASC);

-- CreateIndex
CREATE INDEX "bookings_userId_attendedAt_idx" ON "public"."bookings"("userId" ASC, "attendedAt" ASC);

-- CreateIndex
CREATE INDEX "bookings_userId_scheduledAt_idx" ON "public"."bookings"("userId" ASC, "scheduledAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "schools_v1UserId_key" ON "public"."schools"("v1UserId" ASC);

-- AddForeignKey
ALTER TABLE "public"."belt_ranks" ADD CONSTRAINT "belt_ranks_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "public"."grading_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_tickets" ADD CONSTRAINT "event_tickets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grading_systems" ADD CONSTRAINT "grading_systems_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."memberships" ADD CONSTRAINT "memberships_renewedFromId_fkey" FOREIGN KEY ("renewedFromId") REFERENCES "public"."memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."school_subscriptions" ADD CONSTRAINT "school_subscriptions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
