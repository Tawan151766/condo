import { prisma } from '@/lib/prisma'
import { authenticate, authorize } from '@/lib/auth'
import { successResponse, authError, validationError, serverError, forbiddenError, notFoundError } from '@/lib/response'

// GET /api/buildings/[id] - Get building details
export async function GET(request, { params }) {
  try {
    const buildingId = parseInt(params.id)
    
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        units: {
          include: {
            residents: {
              where: { status: 'active' },
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true
                  }
                }
              }
            }
          },
          orderBy: [
            { floor: 'asc' },
            { unitNumber: 'asc' }
          ]
        },
        _count: {
          select: {
            units: true,
            announcements: true
          }
        }
      }
    })

    if (!building) {
      return notFoundError('Building not found')
    }

    const buildingData = {
      id: building.id,
      name: building.name,
      code: building.code,
      address: building.address,
      total_floors: building.totalFloors,
      total_units: building.totalUnits,
      status: building.status,
      created_at: building.createdAt,
      updated_at: building.updatedAt,
      statistics: {
        total_units: building._count.units,
        total_announcements: building._count.announcements,
        units_by_status: building.units.reduce((acc, unit) => {
          acc[unit.status] = (acc[unit.status] || 0) + 1
          return acc
        }, {}),
        units_by_type: building.units.reduce((acc, unit) => {
          acc[unit.unitType] = (acc[unit.unitType] || 0) + 1
          return acc
        }, {}),
        occupancy_rate: building.units.length > 0 
          ? (building.units.filter(unit => unit.status === 'occupied').length / building.units.length * 100).toFixed(2)
          : 0
      },
      units: building.units.map(unit => ({
        id: unit.id,
        unit_number: unit.unitNumber,
        floor: unit.floor,
        unit_type: unit.unitType,
        area_sqm: unit.areaSqm,
        status: unit.status,
        monthly_fee: unit.monthlyFee,
        residents: unit.residents.map(resident => ({
          id: resident.id,
          relationship: resident.relationship,
          is_primary: resident.isPrimary,
          user: {
            name: `${resident.user.firstName} ${resident.user.lastName}`,
            phone: resident.user.phone
          }
        }))
      }))
    }

    return successResponse(buildingData, 'Building retrieved successfully')

  } catch (error) {
    console.error('Error fetching building:', error)
    return serverError('Failed to fetch building')
  }
}

// PUT /api/buildings/[id] - Update building (Admin only)
export async function PUT(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const buildingId = parseInt(params.id)
    const body = await request.json()
    const { name, code, address, totalFloors, totalUnits, status } = body

    // Check if building exists
    const existingBuilding = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true, code: true }
    })

    if (!existingBuilding) {
      return notFoundError('Building not found')
    }

    // Validation
    const errors = {}
    if (name && name.trim().length === 0) {
      errors.name = ['Building name cannot be empty']
    }
    if (code && code.trim().length === 0) {
      errors.code = ['Building code cannot be empty']
    }
    if (totalFloors && (totalFloors < 1 || totalFloors > 100)) {
      errors.totalFloors = ['Total floors must be between 1 and 100']
    }
    if (totalUnits && (totalUnits < 1 || totalUnits > 1000)) {
      errors.totalUnits = ['Total units must be between 1 and 1000']
    }
    if (status && !['active', 'inactive'].includes(status)) {
      errors.status = ['Invalid status']
    }

    // Check for duplicate code
    if (code && code.trim().toUpperCase() !== existingBuilding.code) {
      const duplicateCode = await prisma.building.findFirst({
        where: { code: code.trim().toUpperCase(), id: { not: buildingId } }
      })
      if (duplicateCode) {
        errors.code = ['Building code already exists']
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Update building
    const updatedBuilding = await prisma.building.update({
      where: { id: buildingId },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim().toUpperCase() }),
        ...(address !== undefined && { address: address?.trim() }),
        ...(totalFloors && { totalFloors }),
        ...(totalUnits && { totalUnits }),
        ...(status && { status })
      }
    })

    return successResponse({
      id: updatedBuilding.id,
      name: updatedBuilding.name,
      code: updatedBuilding.code,
      address: updatedBuilding.address,
      total_floors: updatedBuilding.totalFloors,
      total_units: updatedBuilding.totalUnits,
      status: updatedBuilding.status,
      updated_at: updatedBuilding.updatedAt
    }, 'Building updated successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    if (error.message === 'Insufficient permissions') {
      return forbiddenError(error.message)
    }
    console.error('Error updating building:', error)
    return serverError('Failed to update building')
  }
}

// DELETE /api/buildings/[id] - Delete building (Admin only)
export async function DELETE(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const buildingId = parseInt(params.id)

    // Check if building exists
    const existingBuilding = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        _count: {
          select: {
            units: true
          }
        }
      }
    })

    if (!existingBuilding) {
      return notFoundError('Building not found')
    }

    // Check if building has units
    if (existingBuilding._count.units > 0) {
      return validationError({ 
        building: ['Cannot delete building with existing units'] 
      })
    }

    // Delete building
    await prisma.building.delete({
      where: { id: buildingId }
    })

    return successResponse(null, 'Building deleted successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    if (error.message === 'Insufficient permissions') {
      return forbiddenError(error.message)
    }
    console.error('Error deleting building:', error)
    return serverError('Failed to delete building')
  }
}