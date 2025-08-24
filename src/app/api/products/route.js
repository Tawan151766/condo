import { prisma } from '@/lib/prisma'
import { authenticate, authorize } from '@/lib/auth'
import { successResponse, authError, validationError, serverError, forbiddenError, paginatedResponse } from '@/lib/response'

// GET /api/products - List products with filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category')
    const status = searchParams.get('status') || 'active'
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const minPrice = searchParams.get('min_price')
    const maxPrice = searchParams.get('max_price')
    const inStock = searchParams.get('in_stock') === 'true'

    const where = {
      status,
      ...(categoryId && { categoryId: parseInt(categoryId) }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
      ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
      ...(inStock && { stockQuantity: { gt: 0 } })
    }

    // Validate sort options
    const validSortFields = ['name', 'price', 'created_at', 'stock_quantity']
    const orderBy = validSortFields.includes(sortBy) 
      ? { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' }
      : { createdAt: 'desc' }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              nameTh: true
            }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.product.count({ where })
    ])

    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      image: product.image,
      price: product.price,
      discount_price: product.discountPrice,
      final_price: product.discountPrice || product.price,
      stock_quantity: product.stockQuantity,
      unit: product.unit,
      status: product.status,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
      category: {
        id: product.category.id,
        name: product.category.name,
        name_th: product.category.nameTh
      },
      is_on_sale: !!product.discountPrice,
      discount_percentage: product.discountPrice 
        ? Math.round((1 - product.discountPrice / product.price) * 100)
        : 0
    }))

    return paginatedResponse(formattedProducts, {
      total,
      per_page: limit,
      current_page: page,
      total_pages: Math.ceil(total / limit),
      has_next: page < Math.ceil(total / limit),
      has_previous: page > 1
    })

  } catch (error) {
    console.error('Error fetching products:', error)
    return serverError('Failed to fetch products')
  }
}

// POST /api/products - Create product (Admin only)
export async function POST(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const body = await request.json()
    const { 
      categoryId, 
      name, 
      description, 
      price, 
      discountPrice, 
      stockQuantity, 
      unit, 
      image 
    } = body

    // Validation
    const errors = {}
    if (!categoryId) errors.categoryId = ['Category is required']
    if (!name) errors.name = ['Product name is required']
    if (!price) errors.price = ['Price is required']
    
    if (price && (price < 0 || price > 999999)) {
      errors.price = ['Price must be between 0 and 999,999']
    }
    if (discountPrice && (discountPrice < 0 || discountPrice >= price)) {
      errors.discountPrice = ['Discount price must be less than regular price']
    }
    if (stockQuantity && (stockQuantity < 0 || stockQuantity > 99999)) {
      errors.stockQuantity = ['Stock quantity must be between 0 and 99,999']
    }

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Check if category exists
    const category = await prisma.productCategory.findUnique({
      where: { id: parseInt(categoryId) },
      select: { id: true, status: true }
    })

    if (!category) {
      return validationError({ categoryId: ['Category not found'] })
    }
    if (category.status !== 'active') {
      return validationError({ categoryId: ['Category is not active'] })
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        categoryId: parseInt(categoryId),
        name: name.trim(),
        description: description?.trim(),
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : null,
        stockQuantity: stockQuantity || 0,
        unit: unit || 'ชิ้น',
        image: image?.trim()
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameTh: true
          }
        }
      }
    })

    return successResponse({
      id: product.id,
      name: product.name,
      description: product.description,
      image: product.image,
      price: product.price,
      discount_price: product.discountPrice,
      stock_quantity: product.stockQuantity,
      unit: product.unit,
      status: product.status,
      created_at: product.createdAt,
      category: {
        id: product.category.id,
        name: product.category.name,
        name_th: product.category.nameTh
      }
    }, 'Product created successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    if (error.message === 'Insufficient permissions') {
      return forbiddenError(error.message)
    }
    console.error('Error creating product:', error)
    return serverError('Failed to create product')
  }
}