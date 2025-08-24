import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// PUT /api/bookings/{id}/cancel - Cancel booking
export async function PUT(request, { params }) {
  try {
    const user = await authenticate(request)
    const bookingId = parseInt(params.id)
    const body = await request.json()
    
    const { cancellation_reason } = body

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        facility: {
          select: {
            name: true
          }
        }
      }
    })

    if (!booking) {
      return createResponse(null, 'Booking not found', 404)
    }

    // Check if user can cancel this booking
    if (booking.user_id !== user.id && !['admin', 'staff'].includes(user.role)) {
      return createResponse(null, 'Access denied', 403)
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return createResponse(null, 'Booking is already cancelled', 400)
    }

    if (booking.status === 'completed') {
      return createResponse(null, 'Cannot cancel completed booking', 400)
    }

    // Check cancellation policy (e.g., can't cancel within 24 hours)
    const bookingDateTime = new Date(`${booking.booking_date.toISOString().split('T')[0]}T${booking.start_time}`)
    const now = new Date()
    const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60)

    if (hoursUntilBooking < 24 && user.role === 'resident') {
      return createResponse(null, 'Cannot cancel booking within 24 hours', 400)
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancellation_reason: cancellation_reason || 'User cancelled',
        cancelled_at: new Date(),
        updated_at: new Date()
      },
      include: {
        facility: {
          select: {
            name: true,
            type: true
          }
        }
      }
    })

    // TODO: Send notification to user about cancellation
    // TODO: Process refund if applicable

    return createResponse(updatedBooking, 'Booking cancelled successfully')

  } catch (error) {
    console.error('Cancel booking error:', error)
    return createResponse(null, 'Failed to cancel booking', 500)
  }
}