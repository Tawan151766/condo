import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// GET /api/admin/users - List all users with pagination (Admin)
export async function GET(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const building_id = searchParams.get('building_id')
    
    const skip = (page - 1) * limit
    
    const where = {}
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (role) where.role = role
    if (status) where.status = status
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
                  building: {
                    select: {
                      name: true,
                      code: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.user.count({ where })
    ])

    return createResponse({
      users,
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
    console.error('Get admin users error:', error)
    return createResponse(null, 'Failed to fetch users', 500)
  }
}

// POST /api/admin/users - Create new user (Admin)
export async function POST(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const body = await request.json()
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      status,
      unitId,
      relationship
    } = body

    // Validation
    if (!username || !email || !password || !firstName || !lastName) {
      return createResponse(null, 'Username, email, password, first name, and last name are required', 400)
    }

    if (password.length < 8) {
      return createResponse(null, 'Password must be at least 8 characters', 400)
    }

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    })

    if (existingUser) {
      return createResponse(null, 'Username or email already exists', 400)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        phone,
        role: role || 'resident',
        status: status || 'active'
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
        createdAt: true
      }
    })

    // If unitId is provided and role is resident, create resident record
    if (unitId && (role === 'resident' || !role)) {
      await prisma.resident.create({
        data: {
          userId: newUser.id,
          unitId: parseInt(unitId),
          relationship: relationship || 'owner',
          isPrimary: true,
          status: 'active'
        }
      })
    }

    return createResponse(newUser, 'User created successfully', 201)

  } catch (error) {
    console.error('Create admin user error:', error)
    return createResponse(null, 'Failed to create user', 500)
  }
}