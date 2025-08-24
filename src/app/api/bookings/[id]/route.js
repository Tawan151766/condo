import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/bookings/{id} - Get booking details
export async function GET(request, { params }) {
  try {
    const user = await authenticate(request)
    const bookingId = parseInt(params.id)

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
            hourly_rate: true,
            amenities: true,
            rules: true,
            images: true
          }
        },
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    if (!booking) {
      return createResponse(null, 'Booking not found', 404)
    }

    // Check if user can access this booking
    if (booking.user_id !== user.id && !['admin', 'staff'].includes(user.role)) {
      return createResponse(null, 'Access denied', 403)
    }

    return createResponse(booking)

  } catch (error) {
    console.error('Get booking error:', error)
    return createResponse(null, 'Failed to fetch booking', 500)
  }
}

// PUT /api/bookings/{id} - Update booking (limited fields)
export async function PUT(request, { params }) {
  try {
    const user = await authenticate(request)
    const bookingId = parseInt(params.id)
    const body = await request.json()

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    })

    if (!booking) {
      return createResponse(null, 'Booking not found', 404)
    }

    // Check if user can update this booking
    if (booking.user_id !== user.id && !['admin', 'staff'].includes(user.role)) {
      return createResponse(null, 'Access denied', 403)
    }

    // Only allow updates to certain fields and only if booking is pending
    if (booking.status !== 'pending') {
      return createResponse(null, 'Can only update pending bookings', 400)
    }

    const allowedFields = ['purpose', 'expected_attendees', 'special_requirements', 'contact_phone']
    const updateData = {}
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    if (Object.keys(updateData).length === 0) {
      return createResponse(null, 'No valid fields to update', 400)
    }

    updateData.updated_at = new Date()

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        facility: {
          select: {
            name: true,
            type: true,
            location: true
          }
        }
      }
    })

    return createResponse(updatedBooking, 'Booking updated successfully')

  } catch (error) {
    console.error('Update booking error:', error)
    return createResponse(null, 'Failed to update booking', 500)
  }
}