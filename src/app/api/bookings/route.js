import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/bookings - Get user's bookings
export async function GET(request) {
  try {
    const user = await authenticate(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const status = searchParams.get('status')
    const upcoming_only = searchParams.get('upcoming_only') === 'true'
    
    const skip = (page - 1) * limit
    
    const where = { user_id: user.id }
    if (status) where.status = status
    if (upcoming_only) {
      where.booking_date = {
        gte: new Date()
      }
    }
    
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { booking_date: 'desc' },
          { start_time: 'desc' }
        ],
        include: {
          facility: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true,
              hourly_rate: true
            }
          }
        }
      }),
      prisma.booking.count({ where })
    ])

    return createResponse({
      bookings,
      pagination: {
        total,
        per_page: limit,
        current_page: page,
        total_pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_previous: page > 1
      }
    })

  } catch (error) {
    console.error('Get bookings error:', error)
    return createResponse(null, 'Failed to fetch bookings', 500)
  }
}

// POST /api/bookings - Create new booking
export async function POST(request) {
  try {
    const user = await authenticate(request)
    const body = await request.json()
    
    const {
      facility_id,
      booking_date,
      start_time,
      end_time,
      purpose,
      expected_attendees,
      special_requirements,
      contact_phone
    } = body

    // Validation
    if (!facility_id || !booking_date || !start_time || !end_time) {
      return createResponse(null, 'Facility, date, start time, and end time are required', 400)
    }

    const facilityId = parseInt(facility_id)
    const bookingDateObj = new Date(booking_date)
    const expectedAttendees = parseInt(expected_attendees) || 1

    // Check if facility exists and is active
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId }
    })

    if (!facility || !facility.is_active) {
      return createResponse(null, 'Facility not found or not available', 404)
    }

    // Check capacity
    if (expectedAttendees > facility.capacity) {
      return createResponse(null, `Expected attendees (${expectedAttendees}) exceeds facility capacity (${facility.capacity})`, 400)
    }

    // Check booking time constraints
    const startHour = parseInt(start_time.split(':')[0])
    const endHour = parseInt(end_time.split(':')[0])
    const duration = endHour - startHour

    if (duration < facility.min_booking_hours) {
      return createResponse(null, `Minimum booking duration is ${facility.min_booking_hours} hours`, 400)
    }

    if (duration > facility.max_booking_hours) {
      return createResponse(null, `Maximum booking duration is ${facility.max_booking_hours} hours`, 400)
    }

    // Check for conflicts
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        facility_id: facilityId,
        booking_date: bookingDateObj,
        status: {
          in: ['confirmed', 'pending']
        },
        OR: [
          {
            AND: [
              { start_time: { lte: start_time } },
              { end_time: { gt: start_time } }
            ]
          },
          {
            AND: [
              { start_time: { lt: end_time } },
              { end_time: { gte: end_time } }
            ]
          },
          {
            AND: [
              { start_time: { gte: start_time } },
              { end_time: { lte: end_time } }
            ]
          }
        ]
      }
    })

    if (conflictingBooking) {
      return createResponse(null, 'Time slot is already booked', 400)
    }

    // Calculate total amount
    const totalAmount = facility.hourly_rate * duration

    // Generate booking number
    const bookingCount = await prisma.booking.count()
    const bookingNumber = `BK${new Date().getFullYear()}${(bookingCount + 1).toString().padStart(4, '0')}`

    const booking = await prisma.booking.create({
      data: {
        booking_number: bookingNumber,
        user_id: user.id,
        facility_id: facilityId,
        booking_date: bookingDateObj,
        start_time,
        end_time,
        purpose: purpose || '',
        expected_attendees: expectedAttendees,
        special_requirements: special_requirements || '',
        contact_phone: contact_phone || user.phone,
        total_amount: totalAmount,
        status: 'pending'
      },
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

    return createResponse(booking, 'Booking created successfully', 201)

  } catch (error) {
    console.error('Create booking error:', error)
    return createResponse(null, 'Failed to create booking', 500)
  }
}