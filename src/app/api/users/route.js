import { prisma } from '@/lib/prisma'
import { authenticate, authorize, hashPassword } from '@/lib/auth'
import { successResponse, authError, validationError, serverError, forbiddenError, paginatedResponse } from '@/lib/response'

// GET /api/users - List all users (Admin only)
export async function GET(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''

    const where = {
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(role && { role }),
      ...(status && { status })
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          residents: {
            where: { status: 'active' },
            include: {
              unit: {
                include: {
                  building: { select: { name: true } }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      created_at: user.createdAt,
      unit_info: user.residents.length > 0 ? {
        building: user.residents[0].unit.building.name,
        unit_number: user.residents[0].unit.unitNumber,
        relationship: user.residents[0].relationship
      } : null
    }))

    return paginatedResponse(formattedUsers, {
      total,
      per_page: limit,
      current_page: page,
      total_pages: Math.ceil(total / limit),
      has_next: page < Math.ceil(total / limit),
      has_previous: page > 1
    })

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    if (error.message === 'Insufficient permissions') {
      return forbiddenError(error.message)
    }
    console.error('Error fetching users:', error)
    return serverError('Failed to fetch users')
  }
}

// POST /api/users - Create new user (Admin only)
export async function POST(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const body = await request.json()
    const { username, email, password, firstName, lastName, phone, role } = body

    // Validation
    const errors = {}
    if (!username) errors.username = ['Username is required']
    if (!email) errors.email = ['Email is required']
    if (!password) errors.password = ['Password is required']
    if (!firstName) errors.firstName = ['First name is required']
    if (!lastName) errors.lastName = ['Last name is required']
    
    if (password && password.length < 8) {
      errors.password = ['Password must be at least 8 characters']
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email)) {
      errors.email = ['Invalid email format']
    }

    if (role && !['resident', 'admin', 'staff', 'security'].includes(role)) {
      errors.role = ['Invalid role']
    }

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    })

    if (existingUser) {
      if (existingUser.email === email) {
        return validationError({ email: ['Email already exists'] })
      }
      if (existingUser.username === username) {
        return validationError({ username: ['Username already exists'] })
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role: role || 'resident'
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

    return successResponse({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      first_name: newUser.firstName,
      last_name: newUser.lastName,
      phone: newUser.phone,
      role: newUser.role,
      status: newUser.status,
      created_at: newUser.createdAt
    }, 'User created successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    if (error.message === 'Insufficient permissions') {
      return forbiddenError(error.message)
    }
    console.error('Error creating user:', error)
    return serverError('Failed to create user')
  }
}