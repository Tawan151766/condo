import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/facilities - List all facilities
export async function GET(request) {
  try {
    const user = await authenticate(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const type = searchParams.get('type')
    const available_only = searchParams.get('available_only') === 'true'
    
    const skip = (page - 1) * limit
    
    const where = {}
    if (type) where.type = type
    if (available_only) where.is_active = true
    
    const [facilities, total] = await Promise.all([
      prisma.facility.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { bookings: true }
          }
        }
      }),
      prisma.facility.count({ where })
    ])

    return createResponse({
      facilities,
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
    console.error('Get facilities error:', error)
    return createResponse(null, 'Failed to fetch facilities', 500)
  }
}

// POST /api/facilities - Create facility (Admin only)
export async function POST(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const body = await request.json()
    const {
      name,
      type,
      description,
      capacity,
      hourly_rate,
      operating_hours_start,
      operating_hours_end,
      advance_booking_days,
      min_booking_hours,
      max_booking_hours,
      amenities,
      rules,
      location,
      images
    } = body

    // Validation
    if (!name || !type || !capacity) {
      return createResponse(null, 'Name, type, and capacity are required', 400)
    }

    const facility = await prisma.facility.create({
      data: {
        name,
        type,
        description,
        capacity: parseInt(capacity),
        hourly_rate: parseFloat(hourly_rate) || 0,
        operating_hours_start: operating_hours_start || '08:00:00',
        operating_hours_end: operating_hours_end || '22:00:00',
        advance_booking_days: parseInt(advance_booking_days) || 30,
        min_booking_hours: parseInt(min_booking_hours) || 1,
        max_booking_hours: parseInt(max_booking_hours) || 8,
        amenities: amenities || [],
        rules: rules || [],
        location,
        images: images || [],
        is_active: true,
        created_by: user.id
      }
    })

    return createResponse(facility, 'Facility created successfully', 201)

  } catch (error) {
    console.error('Create facility error:', error)
    return createResponse(null, 'Failed to create facility', 500)
  }
}