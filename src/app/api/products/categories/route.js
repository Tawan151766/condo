import { prisma } from '@/lib/prisma'
import { authenticate, authorize } from '@/lib/auth'
import { successResponse, authError, validationError, serverError, forbiddenError } from '@/lib/response'

// GET /api/products/categories - List all categories
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const includeProducts = searchParams.get('include_products') === 'true'

    const categories = await prisma.productCategory.findMany({
      where: { status },
      include: {
        _count: {
          select: {
            products: true
          }
        },
        ...(includeProducts && {
          products: {
            where: { status: 'active' },
            select: {
              id: true,
              name: true,
              price: true,
              discountPrice: true,
              image: true,
              stockQuantity: true
            },
            take: 10
          }
        })
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      name_th: category.nameTh,
      icon: category.icon,
      sort_order: category.sortOrder,
      status: category.status,
      products_count: category._count.products,
      created_at: category.createdAt,
      ...(includeProducts && {
        products: category.products.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          discount_price: product.discountPrice,
          image: product.image,
          stock_quantity: product.stockQuantity
        }))
      })
    }))

    return successResponse(formattedCategories, 'Categories retrieved successfully')

  } catch (error) {
    console.error('Error fetching categories:', error)
    return serverError('Failed to fetch categories')
  }
}

// POST /api/products/categories - Create category (Admin only)
export async function POST(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const body = await request.json()
    const { name, nameTh, icon, sortOrder } = body

    // Validation
    const errors = {}
    if (!name) errors.name = ['Category name is required']
    if (!nameTh) errors.nameTh = ['Thai name is required']
    if (sortOrder && (sortOrder < 0 || sortOrder > 999)) {
      errors.sortOrder = ['Sort order must be between 0 and 999']
    }

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Check if category name already exists
    const existingCategory = await prisma.productCategory.findFirst({
      where: {
        OR: [
          { name: name.trim() },
          { nameTh: nameTh.trim() }
        ]
      }
    })

    if (existingCategory) {
      if (existingCategory.name === name.trim()) {
        return validationError({ name: ['Category name already exists'] })
      }
      if (existingCategory.nameTh === nameTh.trim()) {
        return validationError({ nameTh: ['Thai name already exists'] })
      }
    }

    // Create category
    const category = await prisma.productCategory.create({
      data: {
        name: name.trim(),
        nameTh: nameTh.trim(),
        icon: icon?.trim(),
        sortOrder: sortOrder || 0
      }
    })

    return successResponse({
      id: category.id,
      name: category.name,
      name_th: category.nameTh,
      icon: category.icon,
      sort_order: category.sortOrder,
      status: category.status,
      created_at: category.createdAt
    }, 'Category created successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    if (error.message === 'Insufficient permissions') {
      return forbiddenError(error.message)
    }
    console.error('Error creating category:', error)
    return serverError('Failed to create category')
  }
}