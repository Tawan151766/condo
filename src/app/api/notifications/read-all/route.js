import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/auth'
import { successResponse, authError, serverError } from '@/lib/response'

// PUT /api/notifications/read-all - Mark all notifications as read
export async function PUT(request) {
  try {
    const user = await authenticate(request)

    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return successResponse({
      updated_count: result.count,
      updated_at: new Date()
    }, 'All notifications marked as read')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error marking all notifications as read:', error)
    return serverError('Failed to mark all notifications as read')
  }
}