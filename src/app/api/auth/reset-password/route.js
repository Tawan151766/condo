import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { successResponse, validationError, authError } from '@/lib/response'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, otp, newPassword, confirmPassword } = body

    // Validation
    const errors = {}
    if (!email) errors.email = ['Email is required']
    if (!otp) errors.otp = ['OTP is required']
    if (!newPassword) errors.newPassword = ['New password is required']
    if (newPassword && newPassword.length < 8) {
      errors.newPassword = ['Password must be at least 8 characters']
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = ['Passwords do not match']
    }

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    })

    if (!user) {
      return authError('Invalid email')
    }

    // Verify OTP
    const otpRecord = await prisma.systemSetting.findUnique({
      where: { settingKey: `password_reset_otp_${user.id}` }
    })

    if (!otpRecord) {
      return authError('OTP not found or expired')
    }

    const otpData = JSON.parse(otpRecord.settingValue)
    
    // Check if OTP is expired
    if (new Date() > new Date(otpData.expiresAt)) {
      // Clean up expired OTP
      await prisma.systemSetting.delete({
        where: { settingKey: `password_reset_otp_${user.id}` }
      })
      return authError('OTP has expired')
    }

    // Verify OTP
    if (otpData.otp !== otp || otpData.email !== email) {
      return authError('Invalid OTP')
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    })

    // Clean up OTP
    await prisma.systemSetting.delete({
      where: { settingKey: `password_reset_otp_${user.id}` }
    })

    return successResponse(
      null,
      'Password reset successfully'
    )

  } catch (error) {
    console.error('Reset password error:', error)
    return serverError('Password reset failed')
  }
}