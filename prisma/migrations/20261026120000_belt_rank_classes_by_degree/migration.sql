-- AlterTable
ALTER TABLE "belt_ranks" ADD COLUMN "classesByDegree" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
