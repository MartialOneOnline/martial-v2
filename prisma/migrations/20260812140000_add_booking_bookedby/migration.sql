-- Track who created a class booking — the student themself via self-service
-- (POST /api/bookings), or a staff member adding them from the dashboard
-- roster (POST /api/dashboard/classes/[id]/bookings). See Booking model in
-- prisma/schema.prisma.
CREATE TYPE "public"."BookedByRole" AS ENUM ('STUDENT', 'STAFF');

ALTER TABLE "bookings" ADD COLUMN "bookedByRole" "public"."BookedByRole" NOT NULL DEFAULT 'STUDENT';
ALTER TABLE "bookings" ADD COLUMN "bookedByUserId" TEXT;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_bookedByUserId_fkey"
  FOREIGN KEY ("bookedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
