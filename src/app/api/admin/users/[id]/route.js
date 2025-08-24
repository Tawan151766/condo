import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/admin/users/{id} - Get specific user (Admin)
export async function GET(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const userId = parseInt(params.id)

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        residents: {
          include: {
            unit: {
              include: {
                building: {
                  select: {
                    name: true,
                    code: true
                  }
                }
              }
            }
          }
        },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            finalAmount: true,
            orderStatus: true,
            createdAt: true
          }
        },
        serviceRequests: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            requestNumber: true,
            title: true,
            status: true,
            createdAt: true
          }
        },
        payments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            paymentReference: true,
            amount: true,
            paymentType: true,
            status: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            orders: true,
            serviceRequests: true,
            payments: true,
            communityPosts: true,
            bookings: true
          }
        }
      }
    })

    if (!targetUser) {
      return createResponse(null, 'User not found', 404)
    }

    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = targetUser

    return createResponse(userWithoutPassword)

  } catch (error) {
    console.error('Get admin user error:', error)
    return createResponse(null, 'Failed to fetch user', 500)
  }
}

// PUT /api/admin/users/{id} - Update user (Admin)
export async function PUT(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const userId = parseInt(params.id)
    const body = await request.json()

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return createResponse(null, 'User not found', 404)
    }

    const {
      username,
      email,
      firstName,
      lastName,
      phone,
      role,
      status,
      profileImage
    } = body

    // Check for duplicate username/email if changed
    if (username && username !== targetUser.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username }
      })
      if (existingUser) {
        return createResponse(null, 'Username already exists', 400)
      }
    }

    if (email && email !== targetUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })
      if (existingUser) {
        return createResponse(null, 'Email already exists', 400)
      }
    }

    const updateData = {}
    if (username !== undefined) updateData.username = username
    if (email !== undefined) updateData.email = email
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (phone !== undefined) updateData.phone = phone
    if (role !== undefined) updateData.role = role
    if (status !== undefined) updateData.status = status
    if (profileImage !== undefined) updateData.profileImage = profileImage

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
        updatedAt: true
      }
    })

    return createResponse(updatedUser, 'User updated successfully')

  } catch (error) {
    console.error('Update admin user error:', error)
    return createResponse(null, 'Failed to update user', 500)
  }
}

// DELETE /api/admin/users/{id} - Delete user (Admin)
export async function DELETE(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const userId = parseInt(params.id)

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return createResponse(null, 'Cannot delete your own account', 400)
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            orders: true,
            serviceRequests: true,
            payments: true
          }
        }
      }
    })

    if (!targetUser) {
      return createResponse(null, 'User not found', 404)
    }

    // Check if user has active data
    if (targetUser._count.orders > 0 || targetUser._count.serviceRequests > 0 || targetUser._count.payments > 0) {
      // Soft delete by setting status to inactive
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'inactive' }
      })
      
      return createResponse(null, 'User deactivated successfully (has existing data)')
    } else {
      // Hard delete if no related data
      await prisma.user.delete({
        where: { id: userId }
      })
      
      return createResponse(null, 'User deleted successfully')
    }

  } catch (error) {
    console.error('Delete admin user error:', error)
    return createResponse(null, 'Failed to delete user', 500)
  }
}