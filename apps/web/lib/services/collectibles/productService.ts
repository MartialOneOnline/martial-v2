import { prisma } from '@/lib/db'
import { MarketplaceSellerType } from '@/lib/prisma-client/enums'
import type { Prisma } from '@/lib/prisma-client/client'
import type { SellerContext } from './collectionService'

function sellerWhere(seller: SellerContext): Prisma.ProductWhereInput {
  return seller.sellerType === MarketplaceSellerType.MARTIAL
    ? { sellerType: MarketplaceSellerType.MARTIAL }
    : { sellerType: MarketplaceSellerType.SCHOOL, schoolId: seller.schoolId! }
}

export async function listProducts(seller: SellerContext) {
  return prisma.product.findMany({
    where: sellerWhere(seller),
    include: { category: true, limitedCollection: { select: { id: true, status: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export interface CreateProductInput {
  name: string
  description?: string
  price: number
  currency?: string
  stock?: number | null
  imageUrl?: string
  categoryId?: string
  isLimitedEdition?: boolean
}

export async function createProduct(seller: SellerContext, input: CreateProductInput) {
  return prisma.product.create({
    data: {
      sellerType: seller.sellerType,
      schoolId: seller.schoolId,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      currency: input.currency ?? 'EUR',
      stock: input.stock ?? null,
      imageUrl: input.imageUrl ?? null,
      categoryId: input.categoryId ?? null,
      isLimitedEdition: input.isLimitedEdition ?? false,
    },
  })
}

export interface UpdateProductInput {
  name?: string
  description?: string | null
  price?: number
  currency?: string
  stock?: number | null
  imageUrl?: string | null
  categoryId?: string | null
  isActive?: boolean
}

export async function updateProduct(seller: SellerContext, id: string, patch: UpdateProductInput) {
  const existing = await prisma.product.findFirst({ where: { id, ...sellerWhere(seller) } })
  if (!existing) return null
  return prisma.product.update({ where: { id }, data: patch })
}

export async function deleteProduct(seller: SellerContext, id: string) {
  const existing = await prisma.product.findFirst({ where: { id, ...sellerWhere(seller) } })
  if (!existing) return null
  if (existing.isLimitedEdition) {
    throw new Error('Cannot delete a limited-edition product — archive its collection instead')
  }
  const hasOrders = await prisma.orderItem.count({ where: { productId: id } })
  if (hasOrders > 0) {
    // Has sales history — archive instead of a hard delete so past orders keep a valid product reference.
    return prisma.product.update({ where: { id }, data: { isActive: false } })
  }
  return prisma.product.delete({ where: { id } })
}

export async function listCategories(seller: SellerContext) {
  return prisma.productCategory.findMany({
    where: seller.sellerType === MarketplaceSellerType.MARTIAL ? { schoolId: null } : { schoolId: seller.schoolId! },
    orderBy: { name: 'asc' },
  })
}
