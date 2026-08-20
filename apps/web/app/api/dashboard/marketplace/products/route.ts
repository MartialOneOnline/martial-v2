import { NextRequest, NextResponse } from 'next/server'
import { authoriseSchoolMarketplace } from '@/lib/auth/marketplaceAuth'
import { listProducts, createProduct, listCategories } from '@/lib/services/collectibles/productService'

// GET /api/dashboard/marketplace/products
export async function GET() {
  const auth = await authoriseSchoolMarketplace('school.marketplace.view')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const [products, categories] = await Promise.all([
    listProducts(auth.seller),
    listCategories(auth.seller),
  ])
  return NextResponse.json({ products, categories })
}

// POST /api/dashboard/marketplace/products
export async function POST(req: NextRequest) {
  const auth = await authoriseSchoolMarketplace('school.marketplace.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const { name, description, price, currency, stock, imageUrl, categoryId, isLimitedEdition } = body
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (price == null || Number(price) < 0) return NextResponse.json({ error: 'A valid price is required' }, { status: 400 })

  const product = await createProduct(auth.seller, {
    name: name.trim(),
    description,
    price: Number(price),
    currency,
    stock: stock != null ? Number(stock) : null,
    imageUrl,
    categoryId,
    isLimitedEdition: Boolean(isLimitedEdition),
  })
  return NextResponse.json(product, { status: 201 })
}
