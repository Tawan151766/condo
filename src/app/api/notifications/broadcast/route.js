import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// POST /api/notifications/broadcast - Broadcast notification to all users (Admin)
export async function POST(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const body = await request.json()
    const {
      title,
      message,
      notification_type,
      priority,
      target_audience,
      building_id,
      schedule_at
    } = body

    // Validation
    if (!title || !message) {
      return createResponse(null, 'Title and message are required', 400)
    }

    // Get target users based on audience
    let targetUsers = []
    
    if (target_audience === 'all') {
      targetUsers = await prisma.user.findMany({
        where: {
          status: 'active',
          role: { in: ['resident', 'admin', 'staff'] }
        },
        select: { id: true }
      })
    } else if (target_audience === 'residents') {
      targetUsers = await prisma.user.findMany({
        where: {
          status: 'active',
          role: 'resident'
        },
        select: { id: true }
      })
    } else if (target_audience === 'building' && building_id) {
      targetUsers = await prisma.user.findMany({
        where: {
          status: 'active',
          role: 'resident',
          residents: {
            some: {
              status: 'active',
              unit: {
                buildingId: parseInt(building_id)
              }
            }
          }
        },
        select: { id: true }
      })
    }

    if (targetUsers.length === 0) {
      return createResponse(null, 'No target users found', 400)
    }

    // Create notifications for all target users
    const notificationsData = targetUsers.map(targetUser => ({
      userId: targetUser.id,
      title,
      message,
      notificationType: notification_type || 'system',
      priority: priority || 'medium',
      isRead: false
    }))

    const createdNotifications = await prisma.notification.createMany({
      data: notificationsData
    })

    // TODO: Send real-time notifications via WebSocket
    // for (const targetUser of targetUsers) {
    //   await sendWebSocketNotification(targetUser.id, {
    //     title,
    //     message,
    //     type: notification_type || 'system',
    //     priority: priority || 'medium',
    //     created_at: new Date().toISOString()
    //   })
    // }

    return createResponse({
      broadcast_id: Date.now(),
      target_count: targetUsers.length,
      notifications_created: createdNotifications.count,
      title,
      message,
      target_audience,
      scheduled_at: schedule_at || new Date().toISOString()
    }, `Notification broadcasted to ${targetUsers.length} users`, 201)

  } catch (error) {
    console.error('Broadcast notification error:', error)
    return createResponse(null, 'Failed to broadcast notification', 500)
  }
}