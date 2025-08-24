import { prisma } from '@/lib/prisma'
import { authenticate, authorize, hashPassword } from '@/lib/auth'
import { successResponse, authError, validationError, serverError, forbiddenError, notFoundError } from '@/lib/response'

// GET /api/users/[id] - Get specific user (Admin only)
export async function GET(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const userId = parseInt(params.id)
    
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileImage: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        residents: {
          include: {
            unit: {
              include: {
                building: { select: { name: true, code: true } }
              }
            }
          }
        }
      }
    })

    if (!targetUser) {
      return notFoundError('User not found')
    }

    const userData = {
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      first_name: targetUser.firstName,
      last_name: targetUser.lastName,
      phone: targetUser.phone,
      profile_image: targetUser.profileImage,
      role: targetUser.role,
      status: targetUser.status,
      created_at: targetUser.createdAt,
      updated_at: targetUser.updatedAt,
      residences: targetUser.residents.map(resident => ({
        id: resident.id,
        relationship: resident.relationship,
        move_in_date: resident.moveInDate,
        move_out_date: resident.moveOutDate,
        is_primary: resident.isPrimary,
        status: resident.status,
        unit: {
          id: resident.unit.id,
          unit_number: resident.unit.unitNumber,
          floor: resident.unit.floor,
          building: {
            name: resident.unit.building.name,
            code: resident.unit.building.code
          }
        }
      }))
    }

    return successResponse(userData, 'User retrieved successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    if (error.message === 'Insufficient permissions') {
      return forbiddenError(error.message)
    }
    console.error('Error fetching user:', error)
    return serverError('Failed to fetch user')
  }
}

// PUT /api/users/[id] - Update user (Admin only)
export async function PUT(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const userId = parseInt(params.id)
    const body = await request.json()
    const { username, email, firstName, lastName, phone, role, status } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true }
    })

    if (!existingUser) {
      return notFoundError('User not found')
    }

    // Validation
    const errors = {}
    if (firstName && firstName.trim().length === 0) {
      errors.firstName = ['First name cannot be empty']
    }
    if (lastName && lastName.trim().length === 0) {
      errors.lastName = ['Last name cannot be empty']
    }
    if (phone && !/^[0-9-+\s()]+$/.test(phone)) {
      errors.phone = ['Invalid phone number format']
    }
    if (role && !['resident', 'admin', 'staff', 'security'].includes(role)) {
      errors.role = ['Invalid role']
    }
    if (status && !['active', 'inactive', 'banned'].includes(status)) {
      errors.status = ['Invalid status']
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email)) {
      errors.email = ['Invalid email format']
    }

    // Check for duplicate username/email
    if (username && username !== existingUser.username) {
      const duplicateUsername = await prisma.user.findFirst({
        where: { username, id: { not: userId } }
      })
      if (duplicateUsername) {
        errors.username = ['Username already exists']
      }
    }

    if (email && email !== existingUser.email) {
      const duplicateEmail = await prisma.user.findFirst({
        where: { email, id: { not: userId } }
      })
      if (duplicateEmail) {
        errors.email = ['Email already exists']
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username: username.trim() }),
        ...(email && { email: email.trim() }),
        ...(firstName && { firstName: firstName.trim() }),
        ...(lastName && { lastName: lastName.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(role && { role }),
        ...(status && { status })
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        updatedAt: true
      }
    })

    return successResponse({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      first_name: updatedUser.firstName,
      last_name: updatedUser.lastName,
      phone: updatedUser.phone,
      role: updatedUser.role,
      status: updatedUser.status,
      updated_at: updatedUser.updatedAt
    }, 'User updated successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    if (error.message === 'Insufficient permissions') {
      return forbiddenError(error.message)
    }
    console.error('Error updating user:', error)
    return serverError('Failed to update user')
  }
}

// DELETE /api/users/[id] - Delete user (Admin only)
export async function DELETE(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const userId = parseInt(params.id)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    })

    if (!existingUser) {
      return notFoundError('User not found')
    }

    // Prevent deleting admin users (optional business rule)
    if (existingUser.role === 'admin' && existingUser.id !== user.id) {
      return forbiddenError('Cannot delete admin users')
    }

    // Delete user (this will cascade delete related records)
    await prisma.user.delete({
      where: { id: userId }
    })

    return successResponse(null, 'User deleted successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    if (error.message === 'Insufficient permissions') {
      return forbiddenError(error.message)
    }
    console.error('Error deleting user:', error)
    return serverError('Failed to delete user')
  }
}