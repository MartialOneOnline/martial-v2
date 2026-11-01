-- AlterTable
ALTER TABLE "belt_ranks" ADD COLUMN "monthsByDegree" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "minAgeByDegree" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "maxClassesPerPeriod" INTEGER;
