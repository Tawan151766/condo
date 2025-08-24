import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/auth'
import { successResponse, authError, serverError, notFoundError } from '@/lib/response'

// POST /api/announcements/[id]/read - Mark announcement as read
export async function POST(request, { params }) {
  try {
    const user = await authenticate(request)
    const announcementId = parseInt(params.id)

    // Check if announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { id: true, title: true }
    })

    if (!announcement) {
      return notFoundError('Announcement not found')
    }

    // Mark as read (upsert to avoid duplicates)
    await prisma.announcementRead.upsert({
      where: {
        unique_read: {
          announcementId,
          userId: user.id
        }
      },
      update: {
        readAt: new Date()
      },
      create: {
        announcementId,
        userId: user.id,
        readAt: new Date()
      }
    })

    return successResponse({
      announcement_id: announcementId,
      read_at: new Date(),
      title: announcement.title
    }, 'Announcement marked as read')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error marking announcement as read:', error)
    return serverError('Failed to mark announcement as read')
  }
}