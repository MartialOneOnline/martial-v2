-- Prevent a duplicate income Transaction for the same Stripe/Revolut payment
-- reference at the database level, as a backstop behind the webhook handlers'
-- own idempotency claims (StripeWebhookEvent event-id claim for Stripe,
-- conditional PENDING->ACTIVE update for Revolut).
--
-- A plain unique index on a nullable column is safe here: Postgres treats
-- every NULL as distinct from every other NULL, so manual/cash transactions
-- (both columns null) are never blocked by each other — only two rows
-- sharing the same non-null provider reference would collide.
--
-- Verified against production data before writing this migration: no
-- existing duplicate stripePaymentIntentId or revolutOrderId values among
-- transactions (checked 2026-07-09, 3321 rows, zero collisions).
DROP INDEX "transactions_stripePaymentIntentId_idx";
DROP INDEX "transactions_revolutOrderId_idx";

CREATE UNIQUE INDEX "transactions_stripePaymentIntentId_key" ON "transactions"("stripePaymentIntentId");
CREATE UNIQUE INDEX "transactions_revolutOrderId_key" ON "transactions"("revolutOrderId");
