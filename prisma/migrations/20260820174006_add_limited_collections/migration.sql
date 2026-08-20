-- CreateEnum
CREATE TYPE "MarketplaceSellerType" AS ENUM ('SCHOOL', 'MARTIAL');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'SOLD_OUT', 'ENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CollectibleUnitStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'AUTHENTICATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OwnershipAcquisitionType" AS ENUM ('PURCHASE');

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "schoolId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "product_categories" ALTER COLUMN "schoolId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "isLimitedEdition" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sellerType" "MarketplaceSellerType" NOT NULL DEFAULT 'SCHOOL',
ALTER COLUMN "schoolId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "limited_collections" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerType" "MarketplaceSellerType" NOT NULL DEFAULT 'SCHOOL',
    "schoolId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "CollectionStatus" NOT NULL DEFAULT 'DRAFT',
    "athleteName" TEXT,
    "athleteUserId" TEXT,
    "brandName" TEXT,
    "collectionYear" INTEGER NOT NULL,
    "totalUnits" INTEGER NOT NULL,
    "launchDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "numberSelectionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "automaticAssignmentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sizeSelectionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "authenticityEnabled" BOOLEAN NOT NULL DEFAULT true,
    "publicRegistryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "authenticationStatement" TEXT,
    "skuPrefix" TEXT NOT NULL,
    "cardTemplateConfig" JSONB NOT NULL DEFAULT '{}',
    "heroImageUrl" TEXT,
    "story" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limited_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limited_collection_tiers" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "startNumber" INTEGER NOT NULL,
    "endNumber" INTEGER NOT NULL,
    "price" DOUBLE PRECISION,
    "currency" TEXT,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "visualStyle" TEXT,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "packagingDescription" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limited_collection_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collectible_units" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "editionNumber" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "size" TEXT,
    "specificPrice" DOUBLE PRECISION,
    "currency" TEXT,
    "status" "CollectibleUnitStatus" NOT NULL DEFAULT 'DRAFT',
    "signed" BOOLEAN NOT NULL DEFAULT false,
    "signedAt" TIMESTAMP(3),
    "signedLocation" TEXT,
    "videoUrl" TEXT,
    "certificateUrl" TEXT,
    "orderId" TEXT,
    "ownerUserId" TEXT,
    "publicVerificationCode" TEXT NOT NULL,
    "reservedAt" TIMESTAMP(3),
    "reservationExpiresAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collectible_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collectible_ownerships" (
    "id" TEXT NOT NULL,
    "collectibleUnitId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "orderId" TEXT,
    "acquisitionType" "OwnershipAcquisitionType" NOT NULL DEFAULT 'PURCHASE',
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "ownerDisplayName" TEXT,
    "showOwnerPublicly" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collectible_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "limited_collections_productId_key" ON "limited_collections"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "limited_collections_slug_key" ON "limited_collections"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "limited_collection_tiers_collectionId_code_key" ON "limited_collection_tiers"("collectionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "collectible_units_sku_key" ON "collectible_units"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "collectible_units_publicVerificationCode_key" ON "collectible_units"("publicVerificationCode");

-- CreateIndex
CREATE INDEX "collectible_units_collectionId_status_idx" ON "collectible_units"("collectionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "collectible_units_collectionId_editionNumber_key" ON "collectible_units"("collectionId", "editionNumber");

-- CreateIndex
CREATE INDEX "collectible_ownerships_collectibleUnitId_isCurrent_idx" ON "collectible_ownerships"("collectibleUnitId", "isCurrent");

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limited_collections" ADD CONSTRAINT "limited_collections_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limited_collections" ADD CONSTRAINT "limited_collections_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limited_collection_tiers" ADD CONSTRAINT "limited_collection_tiers_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "limited_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectible_units" ADD CONSTRAINT "collectible_units_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "limited_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectible_units" ADD CONSTRAINT "collectible_units_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "limited_collection_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectible_units" ADD CONSTRAINT "collectible_units_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectible_units" ADD CONSTRAINT "collectible_units_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectible_ownerships" ADD CONSTRAINT "collectible_ownerships_collectibleUnitId_fkey" FOREIGN KEY ("collectibleUnitId") REFERENCES "collectible_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectible_ownerships" ADD CONSTRAINT "collectible_ownerships_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectible_ownerships" ADD CONSTRAINT "collectible_ownerships_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
