-- AlterTable
ALTER TABLE "events" ADD COLUMN     "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[];
