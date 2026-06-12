-- AlterTable
ALTER TABLE "events" ADD COLUMN     "isCancelled" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "disciplines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
