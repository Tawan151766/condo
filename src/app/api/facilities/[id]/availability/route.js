import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/facilities/{id}/availability - Check facility availability
export async function GET(request, { params }) {
  try {
    const user = await authenticate(request)
    const facilityId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const bookingDate = new Date(date)

    const facility = await prisma.facility.findUnique({
      where: { id: facilityId }
    })

    if (!facility) {
      return createResponse(null, 'Facility not found', 404)
    }

    if (!facility.is_active) {
      return createResponse(null, 'Facility is not available', 400)
    }

    // Get existing bookings for the date
    const existingBookings = await prisma.booking.findMany({
      where: {
        facility_id: facilityId,
        booking_date: bookingDate,
        status: {
          in: ['confirmed', 'pending']
        }
      },
      select: {
        start_time: true,
        end_time: true,
        user: {
          select: {
            first_name: true,
            last_name: true
          }
        }
      },
      orderBy: { start_time: 'asc' }
    })

    // Generate available time slots
    const operatingStart = facility.operating_hours_start
    const operatingEnd = facility.operating_hours_end
    const minHours = facility.min_booking_hours
    
    const availableSlots = []
    const bookedSlots = []

    // Convert existing bookings to booked slots
    existingBookings.forEach(booking => {
      bookedSlots.push({
        start_time: booking.start_time,
        end_time: booking.end_time,
        booked_by: `${booking.user.first_name} ${booking.user.last_name}`
      })
    })

    // Generate available slots (simplified logic)
    const startHour = parseInt(operatingStart.split(':')[0])
    const endHour = parseInt(operatingEnd.split(':')[0])
    
    for (let hour = startHour; hour < endHour - minHours + 1; hour++) {
      const slotStart = `${hour.toString().padStart(2, '0')}:00`
      const slotEnd = `${(hour + minHours).toString().padStart(2, '0')}:00`
      
      // Check if this slot conflicts with existing bookings
      const hasConflict = bookedSlots.some(booked => {
        return (slotStart < booked.end_time && slotEnd > booked.start_time)
      })
      
      if (!hasConflict) {
        availableSlots.push({
          start_time: slotStart,
          end_time: slotEnd
        })
      }
    }

    return createResponse({
      facility: {
        id: facility.id,
        name: facility.name,
        hourly_rate: facility.hourly_rate,
        operating_hours: `${operatingStart}-${operatingEnd}`,
        min_booking_hours: facility.min_booking_hours,
        max_booking_hours: facility.max_booking_hours
      },
      date: date,
      available_slots: availableSlots,
      booked_slots: bookedSlots
    })

  } catch (error) {
    console.error('Get facility availability error:', error)
    return createResponse(null, 'Failed to check availability', 500)
  }
}