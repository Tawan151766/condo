import { prisma } from '@/lib/prisma'
import { verifyPassword, generateTokens } from '@/lib/auth'
import { successResponse, validationError, authError } from '@/lib/response'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validation
    if (!email || !password) {
      return validationError({
        email: !email ? ['Email is required'] : [],
        password: !password ? ['Password is required'] : []
      })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        profileImage: true,
        residents: {
          where: { status: 'active' },
          include: {
            unit: {
              include: {
                building: {
                  select: { name: true }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      return authError('Invalid email or password')
    }

    // Check user status
    if (user.status !== 'active') {
      return authError('Account is inactive or banned')
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return authError('Invalid email or password')
    }

    // Generate tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    })

    // Prepare user data
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
      profile_image: user.profileImage,
      unit_info: user.residents.length > 0 ? {
        building: user.residents[0].unit.building.name,
        unit_number: user.residents[0].unit.unitNumber,
        relationship: user.residents[0].relationship
      } : null
    }

    return successResponse({
      user: userData,
      tokens
    }, 'Login successful')

  } catch (error) {
    console.error('Login error:', error)
    return serverError('Login failed')
  }
}