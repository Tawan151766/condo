import { prisma } from '@/lib/prisma'
import { generateOTP } from '@/lib/auth'
import { successResponse, validationError, notFoundError } from '@/lib/response'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return validationError({ email: ['Email is required'] })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true }
    })

    if (!user) {
      return notFoundError('User with this email not found')
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store OTP in database (you might want to create a separate table for this)
    await prisma.systemSetting.upsert({
      where: { settingKey: `password_reset_otp_${user.id}` },
      update: {
        settingValue: JSON.stringify({
          otp,
          email,
          expiresAt: expiresAt.toISOString()
        })
      },
      create: {
        settingKey: `password_reset_otp_${user.id}`,
        settingValue: JSON.stringify({
          otp,
          email,
          expiresAt: expiresAt.toISOString()
        }),
        settingType: 'json',
        description: 'Password reset OTP'
      }
    })

    // TODO: Send OTP via email/SMS
    // For now, we'll return it in response (remove in production)
    console.log(`Password reset OTP for ${email}: ${otp}`)

    return successResponse({
      message: 'OTP sent to your email',
      // Remove this in production
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    }, 'Password reset OTP sent')

  } catch (error) {
    console.error('Forgot password error:', error)
    return serverError('Failed to send password reset OTP')
  }
}