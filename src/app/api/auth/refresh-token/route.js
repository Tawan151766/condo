import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, generateTokens } from '@/lib/auth'
import { successResponse, authError, validationError } from '@/lib/response'

export async function POST(request) {
  try {
    const body = await request.json()
    const { refresh_token } = body

    if (!refresh_token) {
      return validationError({ refresh_token: ['Refresh token is required'] })
    }

    // Verify refresh token
    let decoded
    try {
      decoded = verifyRefreshToken(refresh_token)
    } catch (error) {
      return authError('Invalid or expired refresh token')
    }

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true
      }
    })

    if (!user || user.status !== 'active') {
      return authError('User not found or inactive')
    }

    // Generate new tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    })

    return successResponse({
      tokens
    }, 'Token refreshed successfully')

  } catch (error) {
    console.error('Token refresh error:', error)
    return serverError('Token refresh failed')
  }
}