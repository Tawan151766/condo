import { prisma } from '@/lib/prisma'
import { hashPassword, generateTokens } from '@/lib/auth'
import { successResponse, validationError, serverError } from '@/lib/response'

export async function POST(request) {
  try {
    const body = await request.json()
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      phone,
      confirmPassword 
    } = body

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
    if (password !== confirmPassword) {
      errors.confirmPassword = ['Passwords do not match']
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email)) {
      errors.email = ['Invalid email format']
    }

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
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
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role: 'resident',
        status: 'active'
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true
      }
    })

    // Generate tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    })

    return successResponse({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.role
      },
      tokens
    }, 'Registration successful', { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return serverError('Registration failed')
  }
}