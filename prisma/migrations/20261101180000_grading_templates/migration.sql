
-- AlterTable
ALTER TABLE "grading_systems" ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "grading_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activity" TEXT,
    "description" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "ranks" JSONB NOT NULL DEFAULT '[]',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "grading_systems" ADD CONSTRAINT "grading_systems_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "grading_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_templates" ADD CONSTRAINT "grading_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

