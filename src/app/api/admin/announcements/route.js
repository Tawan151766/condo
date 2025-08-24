import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/admin/announcements - List all announcements (Admin)
export async function GET(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    
    const skip = (page - 1) * limit
    
    const where = {}
    if (status) where.status = status
    if (type) where.announcementType = type
    
    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          building: {
            select: {
              name: true,
              code: true
            }
          },
          _count: {
            select: { reads: true }
          }
        }
      }),
      prisma.announcement.count({ where })
    ])

    return createResponse({
      announcements,
      pagination: {
        total,
        per_page: limit,
        current_page: page,
        total_pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_previous: page > 1
      }
    })

  } catch (error) {
    console.error('Get admin announcements error:', error)
    return createResponse(null, 'Failed to fetch announcements', 500)
  }
}

// POST /api/admin/announcements - Create announcement (Admin)
export async function POST(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const body = await request.json()
    const {
      title,
      content,
      announcementType,
      priority,
      targetAudience,
      buildingId,
      startDate,
      endDate,
      isPinned,
      attachmentUrl
    } = body

    // Validation
    if (!title || !content) {
      return createResponse(null, 'Title and content are required', 400)
    }

    if (title.length > 200) {
      return createResponse(null, 'Title must be less than 200 characters', 400)
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        announcementType: announcementType || 'general',
        priority: priority || 'medium',
        targetAudience: targetAudience || 'all',
        buildingId: buildingId ? parseInt(buildingId) : null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        isPinned: isPinned || false,
        attachmentUrl,
        createdBy: user.id,
        status: 'published'
      },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        building: {
          select: {
            name: true,
            code: true
          }
        }
      }
    })

    // TODO: Send notifications to target audience
    // if (targetAudience === 'all') {
    //   const users = await prisma.user.findMany({
    //     where: { role: 'resident', status: 'active' }
    //   })
    //   
    //   for (const targetUser of users) {
    //     await createNotification({
    //       userId: targetUser.id,
    //       title: 'ประกาศใหม่',
    //       message: title,
    //       type: 'announcement'
    //     })
    //   }
    // }

    return createResponse(announcement, 'Announcement created successfully', 201)

  } catch (error) {
    console.error('Create admin announcement error:', error)
    return createResponse(null, 'Failed to create announcement', 500)
  }
}