import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/monthly-fees/current - Get current month fee
export async function GET(request) {
  try {
    const user = await authenticate(request)
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    const currentFee = await prisma.monthlyFee.findFirst({
      where: {
        user_id: user.id,
        year: currentYear,
        month: currentMonth
      },
      include: {
        payments: {
          select: {
            id: true,
            amount: true,
            payment_date: true,
            payment_method: true,
            status: true
          }
        }
      }
    })

    if (!currentFee) {
      return createResponse(null, 'Current month fee not found', 404)
    }

    return createResponse(currentFee)

  } catch (error) {
    console.error('Get current monthly fee error:', error)
    return createResponse(null, 'Failed to fetch current monthly fee', 500)
  }
}