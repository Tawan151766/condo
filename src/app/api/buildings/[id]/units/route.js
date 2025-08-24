import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/buildings/{id}/units - List units in building
export async function GET(request, { params }) {
  try {
    const user = await authenticate(request)
    const buildingId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const status = searchParams.get('status')
    const unit_type = searchParams.get('unit_type')
    const floor = searchParams.get('floor')
    
    const skip = (page - 1) * limit
    
    const where = { buildingId }
    if (status) where.status = status
    if (unit_type) where.unitType = unit_type
    if (floor) where.floor = parseInt(floor)
    
    const [units, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { floor: 'asc' },
          { unitNumber: 'asc' }
        ],
        include: {
          building: {
            select: {
              name: true,
              code: true
            }
          },
          residents: {
            where: { status: 'active' },
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          _count: {
            select: { residents: true }
          }
        }
      }),
      prisma.unit.count({ where })
    ])

    return createResponse({
      units,
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
    console.error('Get building units error:', error)
    return createResponse(null, 'Failed to fetch units', 500)
  }
}

// POST /api/buildings/{id}/units - Create unit (Admin only)
export async function POST(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const buildingId = parseInt(params.id)
    const body = await request.json()
    
    const {
      unitNumber,
      floor,
      unitType,
      areaSqm,
      monthlyFee,
      status
    } = body

    // Validation
    if (!unitNumber || !floor || !unitType) {
      return createResponse(null, 'Unit number, floor, and unit type are required', 400)
    }

    // Check if building exists
    const building = await prisma.building.findUnique({
      where: { id: buildingId }
    })

    if (!building) {
      return createResponse(null, 'Building not found', 404)
    }

    // Check if unit number already exists in this building
    const existingUnit = await prisma.unit.findFirst({
      where: {
        buildingId,
        unitNumber
      }
    })

    if (existingUnit) {
      return createResponse(null, 'Unit number already exists in this building', 400)
    }

    const unit = await prisma.unit.create({
      data: {
        buildingId,
        unitNumber,
        floor: parseInt(floor),
        unitType,
        areaSqm: areaSqm ? parseFloat(areaSqm) : null,
        monthlyFee: monthlyFee ? parseFloat(monthlyFee) : 0,
        status: status || 'vacant'
      },
      include: {
        building: {
          select: {
            name: true,
            code: true
          }
        }
      }
    })

    return createResponse(unit, 'Unit created successfully', 201)

  } catch (error) {
    console.error('Create unit error:', error)
    return createResponse(null, 'Failed to create unit', 500)
  }
}