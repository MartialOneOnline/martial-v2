-- Prevent double-booking the same class occurrence at the database level.
--
-- This is a PARTIAL unique index (WHERE status IN ('PENDING','CONFIRMED')) —
-- deliberately not a plain @@unique in schema.prisma, because Prisma does not
-- support conditional/partial unique indexes in the schema DSL. A plain
-- unique index on (userId, classId, scheduledAt) would permanently block
-- rebooking after a user cancels, since the CANCELLED row would still occupy
-- the slot. Scoping the constraint to only the "active" statuses (the same
-- set the app already treats as "counts toward capacity/duplicate", see
-- apps/web/app/api/bookings/route.ts) means a CANCELLED booking frees the
-- slot for a new one, while still making a true concurrent double-booking
-- impossible to commit.
--
-- Because this can't be expressed in schema.prisma, `prisma migrate dev`
-- will not detect drift for it and will not attempt to reproduce or drop it
-- automatically — it only exists via this migration file. Do not remove
-- without adding an equivalent replacement.
CREATE UNIQUE INDEX "bookings_active_user_class_slot_key"
  ON "bookings" ("userId", "classId", "scheduledAt")
  WHERE "status" IN ('PENDING', 'CONFIRMED');
