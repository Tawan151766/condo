import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// PUT /api/admin/bookings/{id}/approve - Approve booking (Admin)
export async function PUT(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const bookingId = parseInt(params.id)
    const body = await request.json()
    const { notes } = body

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        facility: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!booking) {
      return createResponse(null, 'Booking not found', 404)
    }

    if (booking.status !== 'pending') {
      return createResponse(null, 'Only pending bookings can be approved', 400)
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'confirmed',
        updatedAt: new Date()
      },
      include: {
        facility: {
          select: {
            name: true,
            type: true,
            location: true
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // TODO: Send notification to user about booking approval
    // await createNotification({
    //   userId: booking.userId,
    //   title: 'การจองได้รับการอนุมัติ',
    //   message: `การจอง${booking.facility.name} ของคุณได้รับการอนุมัติแล้ว`,
    //   type: 'booking'
    // })

    return createResponse(updatedBooking, 'Booking approved successfully')

  } catch (error) {
    console.error('Approve booking error:', error)
    return createResponse(null, 'Failed to approve booking', 500)
  }
}