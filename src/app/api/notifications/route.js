import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/auth'
import { successResponse, authError, serverError, paginatedResponse } from '@/lib/response'

// GET /api/notifications - List user notifications
export async function GET(request) {
  try {
    const user = await authenticate(request)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const type = searchParams.get('type')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    const where = {
      userId: user.id,
      ...(type && { notificationType: type }),
      ...(unreadOnly && { isRead: false })
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.notification.count({ where })
    ])

    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      notification_type: notification.notificationType,
      reference_type: notification.referenceType,
      reference_id: notification.referenceId,
      is_read: notification.isRead,
      read_at: notification.readAt,
      priority: notification.priority,
      created_at: notification.createdAt
    }))

    return paginatedResponse(formattedNotifications, {
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
    console.error('Error fetching notifications:', error)
    return serverError('Failed to fetch notifications')
  }
}

// DELETE /api/notifications/clear-all - Clear all notifications
export async function DELETE(request) {
  try {
    const user = await authenticate(request)

    await prisma.notification.deleteMany({
      where: { userId: user.id }
    })

    return successResponse(null, 'All notifications cleared successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error clearing notifications:', error)
    return serverError('Failed to clear notifications')
  }
}