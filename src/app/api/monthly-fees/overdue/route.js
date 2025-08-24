import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/monthly-fees/overdue - Get overdue fees
export async function GET(request) {
  try {
    const user = await authenticate(request)
    const now = new Date()

    const overdueFees = await prisma.monthlyFee.findMany({
      where: {
        user_id: user.id,
        status: 'pending',
        due_date: {
          lt: now
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ],
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

    // Calculate total overdue amount and late fees
    let totalOverdue = 0
    let totalLateFees = 0

    const overdueWithLateFees = overdueFees.map(fee => {
      const daysOverdue = Math.floor((now - fee.due_date) / (1000 * 60 * 60 * 24))
      const lateFee = daysOverdue > 0 ? Math.min(daysOverdue * 50, 1000) : 0 // 50 baht per day, max 1000
      
      totalOverdue += fee.amount
      totalLateFees += lateFee

      return {
        ...fee,
        days_overdue: daysOverdue,
        late_fee: lateFee,
        total_amount_due: fee.amount + lateFee
      }
    })

    return createResponse({
      overdue_fees: overdueWithLateFees,
      summary: {
        total_overdue_amount: totalOverdue,
        total_late_fees: totalLateFees,
        total_amount_due: totalOverdue + totalLateFees,
        count: overdueFees.length
      }
    })

  } catch (error) {
    console.error('Get overdue fees error:', error)
    return createResponse(null, 'Failed to fetch overdue fees', 500)
  }
}