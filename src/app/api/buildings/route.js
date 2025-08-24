import { prisma } from '@/lib/prisma'
import { authenticate, authorize } from '@/lib/auth'
import { successResponse, authError, validationError, serverError, forbiddenError, paginatedResponse } from '@/lib/response'

// GET /api/buildings - List all buildings
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(status && { status })
    }

    const [buildings, total] = await Promise.all([
      prisma.building.findMany({
        where,
        include: {
          units: {
            select: {
              id: true,
              unitNumber: true,
              floor: true,
              unitType: true,
              status: true,
            }
          },
          _count: {
            select: {
              units: true
            }
          }
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.building.count({ where })
    ])

    const formattedBuildings = buildings.map(building => ({
      id: building.id,
      name: building.name,
      code: building.code,
      address: building.address,
      total_floors: building.totalFloors,
      total_units: building.totalUnits,
      status: building.status,
      created_at: building.createdAt,
      updated_at: building.updatedAt,
      units_count: building._count.units,
      units_by_status: building.units.reduce((acc, unit) => {
        acc[unit.status] = (acc[unit.status] || 0) + 1
        return acc
      }, {}),
      units: building.units.map(unit => ({
        id: unit.id,
        unit_number: unit.unitNumber,
        floor: unit.floor,
        unit_type: unit.unitType,
        status: unit.status
      }))
    }))

    return paginatedResponse(formattedBuildings, {
      total,
      per_page: limit,
      current_page: page,
      total_pages: Math.ceil(total / limit),
      has_next: page < Math.ceil(total / limit),
      has_previous: page > 1
    })

  } catch (error) {
    console.error('Error fetching buildings:', error)
    return serverError('Failed to fetch buildings')
  }
}

// POST /api/buildings - Create building (Admin only)
export async function POST(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const body = await request.json()
    const { name, code, address, totalFloors, totalUnits } = body

    // Validation
    const errors = {}
    if (!name) errors.name = ['Building name is required']
    if (!code) errors.code = ['Building code is required']
    if (totalFloors && (totalFloors < 1 || totalFloors > 100)) {
      errors.totalFloors = ['Total floors must be between 1 and 100']
    }
    if (totalUnits && (totalUnits < 1 || totalUnits > 1000)) {
      errors.totalUnits = ['Total units must be between 1 and 1000']
    }

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Check if building code already exists
    const existingBuilding = await prisma.building.findUnique({
      where: { code }
    })

    if (existingBuilding) {
      return validationError({ code: ['Building code already exists'] })
    }

    const building = await prisma.building.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address?.trim(),
        totalFloors: totalFloors || 0,
        totalUnits: totalUnits || 0
      }
    })

    return successResponse({
      id: building.id,
      name: building.name,
      code: building.code,
      address: building.address,
      total_floors: building.totalFloors,
      total_units: building.totalUnits,
      status: building.status,
      created_at: building.createdAt
    }, 'Building created successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    if (error.message === 'Insufficient permissions') {
      return forbiddenError(error.message)
    }
    console.error('Error creating building:', error)
    return serverError('Failed to create building')
  }
}