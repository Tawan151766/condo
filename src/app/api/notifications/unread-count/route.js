import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/auth'
import { successResponse, authError, serverError } from '@/lib/response'

// GET /api/notifications/unread-count - Get unread notifications count
export async function GET(request) {
  try {
    const user = await authenticate(request)

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false
      }
    })

    return successResponse({
      unread_count: unreadCount,
      user_id: user.id
    }, 'Unread notifications count retrieved successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error fetching unread notifications count:', error)
    return serverError('Failed to fetch unread notifications count')
  }
}