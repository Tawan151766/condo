import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/auth'
import { successResponse, authError, serverError, notFoundError, forbiddenError } from '@/lib/response'

// PUT /api/notifications/[id]/read - Mark notification as read
export async function PUT(request, { params }) {
  try {
    const user = await authenticate(request)
    const notificationId = parseInt(params.id)

    // Check if notification exists and belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true, isRead: true }
    })

    if (!notification) {
      return notFoundError('Notification not found')
    }

    if (notification.userId !== user.id) {
      return forbiddenError('Access denied')
    }

    // Mark as read
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      },
      select: {
        id: true,
        title: true,
        isRead: true,
        readAt: true
      }
    })

    return successResponse({
      id: updatedNotification.id,
      title: updatedNotification.title,
      is_read: updatedNotification.isRead,
      read_at: updatedNotification.readAt
    }, 'Notification marked as read')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error marking notification as read:', error)
    return serverError('Failed to mark notification as read')
  }
}