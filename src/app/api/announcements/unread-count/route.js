import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/auth'
import { successResponse, authError, serverError } from '@/lib/response'

// GET /api/announcements/unread-count - Get unread announcements count
export async function GET(request) {
  try {
    const user = await authenticate(request)

    // Get user's building for targeted announcements
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

    // Count unread announcements
    const unreadCount = await prisma.announcement.count({
      where: {
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
        reads: {
          none: { userId: user.id }
        }
      }
    })

    return successResponse({
      unread_count: unreadCount,
      user_id: user.id
    }, 'Unread count retrieved successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error fetching unread count:', error)
    return serverError('Failed to fetch unread count')
  }
}