-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "revolutOrderId" TEXT,
ADD COLUMN     "stripeInvoiceId" TEXT;

-- CreateIndex
CREATE INDEX "transactions_stripePaymentIntentId_idx" ON "transactions"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "transactions_revolutOrderId_idx" ON "transactions"("revolutOrderId");
