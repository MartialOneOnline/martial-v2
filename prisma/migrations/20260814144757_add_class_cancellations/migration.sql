-- CreateTable
CREATE TABLE "class_cancellations" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_cancellations_classId_date_key" ON "class_cancellations"("classId", "date");

-- AddForeignKey
ALTER TABLE "class_cancellations" ADD CONSTRAINT "class_cancellations_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
