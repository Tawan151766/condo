import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/admin/facilities - List all facilities (Admin)
export async function GET(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const type = searchParams.get('type')
    const is_active = searchParams.get('is_active')
    
    const skip = (page - 1) * limit
    
    const where = {}
    if (type) where.type = type
    if (is_active !== null) where.isActive = is_active === 'true'
    
    const [facilities, total] = await Promise.all([
      prisma.facility.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: { 
              bookings: {
                where: {
                  bookingDate: {
                    gte: new Date()
                  }
                }
              }
            }
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
    console.error('Get admin facilities error:', error)
    return createResponse(null, 'Failed to fetch facilities', 500)
  }
}

// POST /api/admin/facilities - Create facility (Admin)
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
      hourlyRate,
      operatingHoursStart,
      operatingHoursEnd,
      advanceBookingDays,
      minBookingHours,
      maxBookingHours,
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
        hourlyRate: parseFloat(hourlyRate) || 0,
        operatingHoursStart: operatingHoursStart || '08:00:00',
        operatingHoursEnd: operatingHoursEnd || '22:00:00',
        advanceBookingDays: parseInt(advanceBookingDays) || 30,
        minBookingHours: parseInt(minBookingHours) || 1,
        maxBookingHours: parseInt(maxBookingHours) || 8,
        amenities: amenities || [],
        rules: rules || [],
        location,
        images: images || [],
        isActive: true,
        createdBy: user.id
      },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return createResponse(facility, 'Facility created successfully', 201)

  } catch (error) {
    console.error('Create admin facility error:', error)
    return createResponse(null, 'Failed to create facility', 500)
  }
}