import { prisma } from '@/lib/prisma'
import { successResponse, validationError, authError } from '@/lib/response'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, otp, type = 'password_reset' } = body

    if (!email || !otp) {
      return validationError({
        email: !email ? ['Email is required'] : [],
        otp: !otp ? ['OTP is required'] : []
      })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    })

    if (!user) {
      return authError('Invalid email')
    }

    // Verify OTP based on type
    const otpKey = `${type}_otp_${user.id}`
    const otpRecord = await prisma.systemSetting.findUnique({
      where: { settingKey: otpKey }
    })

    if (!otpRecord) {
      return authError('OTP not found or expired')
    }

    const otpData = JSON.parse(otpRecord.settingValue)
    
    // Check if OTP is expired
    if (new Date() > new Date(otpData.expiresAt)) {
      // Clean up expired OTP
      await prisma.systemSetting.delete({
        where: { settingKey: otpKey }
      })
      return authError('OTP has expired')
    }

    // Verify OTP
    if (otpData.otp !== otp || otpData.email !== email) {
      return authError('Invalid OTP')
    }

    return successResponse({
      verified: true,
      email: user.email
    }, 'OTP verified successfully')

  } catch (error) {
    console.error('OTP verification error:', error)
    return serverError('OTP verification failed')
  }
}