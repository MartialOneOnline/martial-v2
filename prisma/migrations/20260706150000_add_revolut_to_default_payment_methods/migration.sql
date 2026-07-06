-- AlterTable
ALTER TABLE "public"."platform_settings" ALTER COLUMN "enabledPaymentMethods" SET DEFAULT ARRAY['STRIPE', 'REVOLUT', 'CASH', 'BANK_TRANSFER', 'DIRECT_DEBIT', 'PAYPAL', 'OTHER']::TEXT[];
