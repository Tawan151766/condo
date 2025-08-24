import { prisma } from '@/lib/prisma'
import { authenticate, hashPassword, verifyPassword } from '@/lib/auth'
import { successResponse, authError, validationError, serverError } from '@/lib/response'

export async function PUT(request) {
  try {
    const user = await authenticate(request)
    const body = await request.json()
    
    const { currentPassword, newPassword, confirmPassword } = body

    // Validation
    const errors = {}
    if (!currentPassword) errors.currentPassword = ['Current password is required']
    if (!newPassword) errors.newPassword = ['New password is required']
    if (!confirmPassword) errors.confirmPassword = ['Confirm password is required']
    
    if (newPassword && newPassword.length < 8) {
      errors.newPassword = ['New password must be at least 8 characters']
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = ['Passwords do not match']
    }
    if (currentPassword === newPassword) {
      errors.newPassword = ['New password must be different from current password']
    }

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Get current user with password
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true }
    })

    if (!currentUser) {
      return authError('User not found')
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, currentUser.passwordHash)
    if (!isValidPassword) {
      return validationError({ 
        currentPassword: ['Current password is incorrect'] 
      })
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash }
    })

    return successResponse(
      null,
      'Password changed successfully'
    )

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Change password error:', error)
    return serverError('Failed to change password')
  }
}