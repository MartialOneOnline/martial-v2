-- AlterEnum
ALTER TYPE "SchoolMemberRole" ADD VALUE 'CUSTOM';

-- AlterTable
ALTER TABLE "school_members" ADD COLUMN     "customRoleId" TEXT;

-- CreateTable
CREATE TABLE "staff_roles" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_roles_schoolId_name_key" ON "staff_roles"("schoolId", "name");

-- AddForeignKey
ALTER TABLE "school_members" ADD CONSTRAINT "school_members_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "staff_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_roles" ADD CONSTRAINT "staff_roles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
