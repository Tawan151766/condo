import { prisma } from '@/lib/prisma'
import { authenticate, authorize } from '@/lib/auth'
import { successResponse, authError, validationError, serverError, forbiddenError } from '@/lib/response'

// GET /api/services/categories - List service categories
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const includeStats = searchParams.get('include_stats') === 'true'

    const categories = await prisma.serviceCategory.findMany({
      where: { status },
      include: {
        ...(includeStats && {
          _count: {
            select: {
              serviceRequests: true
            }
          }
        })
      },
      orderBy: { name: 'asc' }
    })

    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      name_th: category.nameTh,
      icon: category.icon,
      description: category.description,
      is_repair_service: category.isRepairService,
      status: category.status,
      created_at: category.createdAt,
      ...(includeStats && {
        requests_count: category._count?.serviceRequests || 0
      })
    }))

    return successResponse(formattedCategories, 'Service categories retrieved successfully')

  } catch (error) {
    console.error('Error fetching service categories:', error)
    return serverError('Failed to fetch service categories')
  }
}

// POST /api/services/categories - Create service category (Admin only)
export async function POST(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const body = await request.json()
    const { name, nameTh, icon, description, isRepairService = false } = body

    // Validation
    const errors = {}
    if (!name) errors.name = ['Category name is required']
    if (!nameTh) errors.nameTh = ['Thai name is required']

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Check if category name already exists
    const existingCategory = await prisma.serviceCategory.findFirst({
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
    const category = await prisma.serviceCategory.create({
      data: {
        name: name.trim(),
        nameTh: nameTh.trim(),
        icon: icon?.trim(),
        description: description?.trim(),
        isRepairService: Boolean(isRepairService)
      }
    })

    return successResponse({
      id: category.id,
      name: category.name,
      name_th: category.nameTh,
      icon: category.icon,
      description: category.description,
      is_repair_service: category.isRepairService,
      status: category.status,
      created_at: category.createdAt
    }, 'Service category created successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    if (error.message === 'Insufficient permissions') {
      return forbiddenError(error.message)
    }
    console.error('Error creating service category:', error)
    return serverError('Failed to create service category')
  }
}