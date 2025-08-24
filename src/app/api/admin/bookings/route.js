import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/admin/bookings - List all bookings (Admin)
export async function GET(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const status = searchParams.get('status')
    const facility_id = searchParams.get('facility_id')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    
    const skip = (page - 1) * limit
    
    const where = {}
    if (status) where.status = status
    if (facility_id) where.facilityId = parseInt(facility_id)
    if (date_from || date_to) {
      where.bookingDate = {}
      if (date_from) where.bookingDate.gte = new Date(date_from)
      if (date_to) where.bookingDate.lte = new Date(date_to)
    }
    
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { bookingDate: 'desc' },
          { startTime: 'desc' }
        ],
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          facility: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true
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
    console.error('Get admin bookings error:', error)
    return createResponse(null, 'Failed to fetch bookings', 500)
  }
}