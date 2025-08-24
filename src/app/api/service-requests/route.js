import { prisma } from '@/lib/prisma'
import { authenticate, authorize } from '@/lib/auth'
import { successResponse, authError, validationError, serverError, forbiddenError, paginatedResponse, notFoundError } from '@/lib/response'

// Generate service request number
function generateRequestNumber() {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = Date.now().toString().slice(-6)
  return `SRV-${dateStr}-${timeStr}`
}

// GET /api/service-requests - Get user's service requests
export async function GET(request) {
  try {
    const user = await authenticate(request)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 10
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const categoryId = searchParams.get('category_id')

    const where = {
      userId: user.id,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(categoryId && { categoryId: parseInt(categoryId) })
    }

    const [requests, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        include: {
          category: {
            select: {
              name: true,
              nameTh: true,
              icon: true,
              isRepairService: true
            }
          },
          assignedUser: {
            select: {
              firstName: true,
              lastName: true,
              phone: true
            }
          },
          attachments: {
            select: {
              id: true,
              fileName: true,
              filePath: true,
              fileType: true,
              fileSize: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.serviceRequest.count({ where })
    ])

    const formattedRequests = requests.map(request => ({
      id: request.id,
      request_number: request.requestNumber,
      title: request.title,
      description: request.description,
      priority: request.priority,
      location: request.location,
      preferred_date: request.preferredDate,
      preferred_time: request.preferredTime,
      contact_phone: request.contactPhone,
      status: request.status,
      estimated_cost: request.estimatedCost,
      actual_cost: request.actualCost,
      completion_date: request.completionDate,
      rating: request.rating,
      feedback: request.feedback,
      created_at: request.createdAt,
      updated_at: request.updatedAt,
      category: {
        name: request.category.name,
        name_th: request.category.nameTh,
        icon: request.category.icon,
        is_repair_service: request.category.isRepairService
      },
      assigned_technician: request.assignedUser ? {
        name: `${request.assignedUser.firstName} ${request.assignedUser.lastName}`,
        phone: request.assignedUser.phone
      } : null,
      attachments: request.attachments.map(attachment => ({
        id: attachment.id,
        file_name: attachment.fileName,
        file_path: attachment.filePath,
        file_type: attachment.fileType,
        file_size: attachment.fileSize
      }))
    }))

    return paginatedResponse(formattedRequests, {
      total,
      per_page: limit,
      current_page: page,
      total_pages: Math.ceil(total / limit),
      has_next: page < Math.ceil(total / limit),
      has_previous: page > 1
    })

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error fetching service requests:', error)
    return serverError('Failed to fetch service requests')
  }
}

// POST /api/service-requests - Create new service request
export async function POST(request) {
  try {
    const user = await authenticate(request)
    const body = await request.json()
    const { 
      categoryId, 
      title, 
      description, 
      priority = 'medium',
      location,
      preferredDate,
      preferredTime,
      contactPhone
    } = body

    // Validation
    const errors = {}
    if (!categoryId) errors.categoryId = ['Category is required']
    if (!title) errors.title = ['Title is required']
    if (!description) errors.description = ['Description is required']
    
    if (title && title.length > 200) {
      errors.title = ['Title cannot exceed 200 characters']
    }
    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      errors.priority = ['Invalid priority level']
    }
    if (contactPhone && !/^[0-9-+\s()]+$/.test(contactPhone)) {
      errors.contactPhone = ['Invalid phone number format']
    }

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Check if category exists
    const category = await prisma.serviceCategory.findUnique({
      where: { id: parseInt(categoryId) },
      select: { id: true, status: true, nameTh: true }
    })

    if (!category) {
      return validationError({ categoryId: ['Category not found'] })
    }
    if (category.status !== 'active') {
      return validationError({ categoryId: ['Category is not active'] })
    }

    // Create service request
    const requestNumber = generateRequestNumber()

    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        userId: user.id,
        categoryId: parseInt(categoryId),
        requestNumber,
        title: title.trim(),
        description: description.trim(),
        priority,
        location: location?.trim(),
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        preferredTime: preferredTime ? new Date(`1970-01-01T${preferredTime}`) : null,
        contactPhone: contactPhone?.trim()
      },
      include: {
        category: {
          select: { nameTh: true }
        }
      }
    })

    // Estimate response time based on priority
    const responseTimeHours = {
      urgent: 2,
      high: 4,
      medium: 24,
      low: 48
    }

    return successResponse({
      id: serviceRequest.id,
      request_number: serviceRequest.requestNumber,
      title: serviceRequest.title,
      category: serviceRequest.category.nameTh,
      priority: serviceRequest.priority,
      status: serviceRequest.status,
      estimated_response_time: `${responseTimeHours[priority]} hours`,
      created_at: serviceRequest.createdAt
    }, 'Service request created successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error creating service request:', error)
    return serverError('Failed to create service request')
  }
}