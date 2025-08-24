import { prisma } from '@/lib/prisma'
import { authenticate, authorize } from '@/lib/auth'
import { successResponse, authError, validationError, serverError, forbiddenError, paginatedResponse } from '@/lib/response'

// GET /api/announcements - List announcements
export async function GET(request) {
  try {
    const user = await authenticate(request)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 10
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    // Build where clause based on user's building and target audience
    const userResidence = await prisma.resident.findFirst({
      where: { 
        userId: user.id, 
        status: 'active' 
      },
      include: {
        unit: {
          select: { buildingId: true }
        }
      }
    })

    const where = {
      status: 'published',
      startDate: { lte: new Date() },
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ],
      AND: [
        {
          OR: [
            { targetAudience: 'all' },
            { targetAudience: user.role === 'resident' ? 'residents' : user.role },
            ...(userResidence ? [{ 
              targetAudience: 'specific_building',
              buildingId: userResidence.unit.buildingId 
            }] : [])
          ]
        }
      ],
      ...(type && { announcementType: type }),
      ...(priority && { priority })
    }

    let announcementsQuery = prisma.announcement.findMany({
      where,
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        },
        building: {
          select: {
            name: true,
            code: true
          }
        },
        reads: {
          where: { userId: user.id },
          select: { readAt: true }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    })

    let countQuery = prisma.announcement.count({ where })

    // Filter for unread only if requested
    if (unreadOnly) {
      const whereUnread = {
        ...where,
        reads: {
          none: { userId: user.id }
        }
      }
      announcementsQuery = prisma.announcement.findMany({
        where: whereUnread,
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
              role: true
            }
          },
          building: {
            select: {
              name: true,
              code: true
            }
          },
          reads: {
            where: { userId: user.id },
            select: { readAt: true }
          }
        },
        orderBy: [
          { isPinned: 'desc' },
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      })
      countQuery = prisma.announcement.count({ where: whereUnread })
    }

    const [announcements, total] = await Promise.all([
      announcementsQuery,
      countQuery
    ])

    const formattedAnnouncements = announcements.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      announcement_type: announcement.announcementType,
      priority: announcement.priority,
      target_audience: announcement.targetAudience,
      start_date: announcement.startDate,
      end_date: announcement.endDate,
      is_pinned: announcement.isPinned,
      attachment_url: announcement.attachmentUrl,
      created_at: announcement.createdAt,
      is_read: announcement.reads.length > 0,
      read_at: announcement.reads.length > 0 ? announcement.reads[0].readAt : null,
      creator: {
        name: `${announcement.creator.firstName} ${announcement.creator.lastName}`,
        role: announcement.creator.role
      },
      building: announcement.building ? {
        name: announcement.building.name,
        code: announcement.building.code
      } : null
    }))

    return paginatedResponse(formattedAnnouncements, {
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
    console.error('Error fetching announcements:', error)
    return serverError('Failed to fetch announcements')
  }
}

// POST /api/announcements - Create announcement (Admin only)
export async function POST(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const body = await request.json()
    const { 
      title, 
      content, 
      announcementType = 'general',
      priority = 'medium',
      targetAudience = 'all',
      buildingId,
      startDate,
      endDate,
      isPinned = false,
      attachmentUrl
    } = body

    // Validation
    const errors = {}
    if (!title) errors.title = ['Title is required']
    if (!content) errors.content = ['Content is required']
    if (!startDate) errors.startDate = ['Start date is required']
    
    if (title && title.length > 200) {
      errors.title = ['Title cannot exceed 200 characters']
    }
    if (!['general', 'maintenance', 'emergency', 'event', 'policy'].includes(announcementType)) {
      errors.announcementType = ['Invalid announcement type']
    }
    if (!['low', 'medium', 'high'].includes(priority)) {
      errors.priority = ['Invalid priority level']
    }
    if (!['all', 'residents', 'owners', 'tenants', 'specific_building'].includes(targetAudience)) {
      errors.targetAudience = ['Invalid target audience']
    }
    if (targetAudience === 'specific_building' && !buildingId) {
      errors.buildingId = ['Building is required for specific building audience']
    }
    if (endDate && new Date(endDate) <= new Date(startDate)) {
      errors.endDate = ['End date must be after start date']
    }

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Check if building exists (if specified)
    if (buildingId) {
      const building = await prisma.building.findUnique({
        where: { id: parseInt(buildingId) },
        select: { id: true, status: true }
      })

      if (!building) {
        return validationError({ buildingId: ['Building not found'] })
      }
      if (building.status !== 'active') {
        return validationError({ buildingId: ['Building is not active'] })
      }
    }

    // Create announcement
    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        announcementType,
        priority,
        targetAudience,
        buildingId: buildingId ? parseInt(buildingId) : null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isPinned: Boolean(isPinned),
        attachmentUrl: attachmentUrl?.trim(),
        createdBy: user.id,
        status: 'published'
      },
      include: {
        building: {
          select: { name: true, code: true }
        }
      }
    })

    return successResponse({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      announcement_type: announcement.announcementType,
      priority: announcement.priority,
      target_audience: announcement.targetAudience,
      start_date: announcement.startDate,
      end_date: announcement.endDate,
      is_pinned: announcement.isPinned,
      status: announcement.status,
      created_at: announcement.createdAt,
      building: announcement.building
    }, 'Announcement created successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    if (error.message === 'Insufficient permissions') {
      return forbiddenError(error.message)
    }
    console.error('Error creating announcement:', error)
    return serverError('Failed to create announcement')
  }
}