import { prisma } from '@/lib/prisma'
import { authenticate, hashPassword, verifyPassword } from '@/lib/auth'
import { successResponse, authError, validationError, serverError } from '@/lib/response'

// GET /api/users/profile - Get user profile
export async function GET(request) {
  try {
    const user = await authenticate(request)
    
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
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
        residents: {
          where: { status: 'active' },
          include: {
            unit: {
              include: {
                building: {
                  select: { name: true, code: true }
                }
              }
            }
          }
        }
      }
    })

    if (!profile) {
      return authError('User not found')
    }

    const userData = {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      first_name: profile.firstName,
      last_name: profile.lastName,
      phone: profile.phone,
      profile_image: profile.profileImage,
      role: profile.role,
      status: profile.status,
      created_at: profile.createdAt,
      unit_info: profile.residents.length > 0 ? {
        building: profile.residents[0].unit.building.name,
        building_code: profile.residents[0].unit.building.code,
        unit_number: profile.residents[0].unit.unitNumber,
        relationship: profile.residents[0].relationship,
        move_in_date: profile.residents[0].moveInDate
      } : null
    }

    return successResponse(userData, 'Profile retrieved successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Get profile error:', error)
    return serverError('Failed to retrieve profile')
  }
}

// PUT /api/users/profile - Update user profile
export async function PUT(request) {
  try {
    const user = await authenticate(request)
    const body = await request.json()
    
    const { firstName, lastName, phone, username } = body

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

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          id: { not: user.id }
        }
      })
      if (existingUser) {
        errors.username = ['Username already exists']
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Update profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(firstName && { firstName: firstName.trim() }),
        ...(lastName && { lastName: lastName.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(username && { username: username.trim() })
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileImage: true,
        role: true,
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
      profile_image: updatedUser.profileImage,
      role: updatedUser.role,
      updated_at: updatedUser.updatedAt
    }, 'Profile updated successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Update profile error:', error)
    return serverError('Failed to update profile')
  }
}