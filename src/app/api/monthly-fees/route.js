import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/monthly-fees - Get user's monthly fees
export async function GET(request) {
  try {
    const user = await authenticate(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const status = searchParams.get('status')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    
    const skip = (page - 1) * limit
    
    const where = { user_id: user.id }
    if (status) where.status = status
    if (year) where.year = parseInt(year)
    if (month) where.month = parseInt(month)
    
    const [monthlyFees, total] = await Promise.all([
      prisma.monthlyFee.findMany({
        where,
        skip,
        take: limit,
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
      }),
      prisma.monthlyFee.count({ where })
    ])

    return createResponse({
      monthly_fees: monthlyFees,
      pagination: {
        total,
        per_page: limit,
        current_page: page,
        total_pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_previous: page > 1
      }
    })

  } catch (error) {
    console.error('Get monthly fees error:', error)
    return createResponse(null, 'Failed to fetch monthly fees', 500)
  }
}