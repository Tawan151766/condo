import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/facilities/{id} - Get facility details
export async function GET(request, { params }) {
  try {
    const user = await authenticate(request)
    const facilityId = parseInt(params.id)

    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      include: {
        bookings: {
          where: {
            booking_date: {
              gte: new Date()
            },
            status: {
              in: ['confirmed', 'pending']
            }
          },
          select: {
            id: true,
            booking_date: true,
            start_time: true,
            end_time: true,
            status: true,
            user: {
              select: {
                first_name: true,
                last_name: true
              }
            }
          },
          orderBy: [
            { booking_date: 'asc' },
            { start_time: 'asc' }
          ]
        },
        _count: {
          select: { bookings: true }
        }
      }
    })

    if (!facility) {
      return createResponse(null, 'Facility not found', 404)
    }

    return createResponse(facility)

  } catch (error) {
    console.error('Get facility error:', error)
    return createResponse(null, 'Failed to fetch facility', 500)
  }
}

// PUT /api/facilities/{id} - Update facility (Admin only)
export async function PUT(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const facilityId = parseInt(params.id)
    const body = await request.json()

    const facility = await prisma.facility.findUnique({
      where: { id: facilityId }
    })

    if (!facility) {
      return createResponse(null, 'Facility not found', 404)
    }

    const updatedFacility = await prisma.facility.update({
      where: { id: facilityId },
      data: {
        ...body,
        capacity: body.capacity ? parseInt(body.capacity) : undefined,
        hourly_rate: body.hourly_rate ? parseFloat(body.hourly_rate) : undefined,
        advance_booking_days: body.advance_booking_days ? parseInt(body.advance_booking_days) : undefined,
        min_booking_hours: body.min_booking_hours ? parseInt(body.min_booking_hours) : undefined,
        max_booking_hours: body.max_booking_hours ? parseInt(body.max_booking_hours) : undefined,
        updated_at: new Date()
      }
    })

    return createResponse(updatedFacility, 'Facility updated successfully')

  } catch (error) {
    console.error('Update facility error:', error)
    return createResponse(null, 'Failed to update facility', 500)
  }
}

// DELETE /api/facilities/{id} - Delete facility (Admin only)
export async function DELETE(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const facilityId = parseInt(params.id)

    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    })

    if (!facility) {
      return createResponse(null, 'Facility not found', 404)
    }

    // Check if facility has active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        facility_id: facilityId,
        booking_date: {
          gte: new Date()
        },
        status: {
          in: ['confirmed', 'pending']
        }
      }
    })

    if (activeBookings > 0) {
      return createResponse(null, 'Cannot delete facility with active bookings', 400)
    }

    await prisma.facility.delete({
      where: { id: facilityId }
    })

    return createResponse(null, 'Facility deleted successfully')

  } catch (error) {
    console.error('Delete facility error:', error)
    return createResponse(null, 'Failed to delete facility', 500)
  }
}