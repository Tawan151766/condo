import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/admin/analytics/revenue - Revenue analytics
export async function GET(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '6months' // 6months, 1year, custom
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const now = new Date()
    let dateRange = {}

    if (period === '1year') {
      dateRange = {
        gte: new Date(now.getFullYear() - 1, now.getMonth(), 1)
      }
    } else if (period === 'custom' && startDate && endDate) {
      dateRange = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } else {
      // Default 6 months
      dateRange = {
        gte: new Date(now.getFullYear(), now.getMonth() - 6, 1)
      }
    }

    // Revenue overview
    const [
      totalRevenue,
      monthlyFeeRevenue,
      orderRevenue,
      bookingRevenue,
      pendingPayments
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          status: 'confirmed',
          paymentDate: dateRange
        },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'confirmed',
          paymentType: 'monthly_fee',
          paymentDate: dateRange
        },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'confirmed',
          paymentType: 'product_order',
          paymentDate: dateRange
        },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'confirmed',
          paymentType: 'facility_booking',
          paymentDate: dateRange
        },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'pending'
        },
        _sum: { amount: true }
      })
    ])

    // Monthly revenue breakdown
    const monthlyRevenue = []
    const months = period === '1year' ? 12 : 6
    
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const [total, monthlyFees, orders, bookings] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            status: 'confirmed',
            paymentDate: { gte: monthStart, lte: monthEnd }
          },
          _sum: { amount: true }
        }),
        prisma.payment.aggregate({
          where: {
            status: 'confirmed',
            paymentType: 'monthly_fee',
            paymentDate: { gte: monthStart, lte: monthEnd }
          },
          _sum: { amount: true }
        }),
        prisma.payment.aggregate({
          where: {
            status: 'confirmed',
            paymentType: 'product_order',
            paymentDate: { gte: monthStart, lte: monthEnd }
          },
          _sum: { amount: true }
        }),
        prisma.payment.aggregate({
          where: {
            status: 'confirmed',
            paymentType: 'facility_booking',
            paymentDate: { gte: monthStart, lte: monthEnd }
          },
          _sum: { amount: true }
        })
      ])
      
      monthlyRevenue.push({
        month: monthStart.toISOString().slice(0, 7),
        total_revenue: total._sum.amount || 0,
        monthly_fees: monthlyFees._sum.amount || 0,
        orders: orders._sum.amount || 0,
        bookings: bookings._sum.amount || 0
      })
    }

    // Revenue by payment method
    const revenueByPaymentMethod = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: {
        status: 'confirmed',
        paymentDate: dateRange
      },
      _sum: { amount: true },
      _count: { id: true }
    })

    // Top revenue generating units/users
    const topRevenueUsers = await prisma.payment.groupBy({
      by: ['userId'],
      where: {
        status: 'confirmed',
        paymentDate: dateRange
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10
    })

    // Get user details for top revenue users
    const topUsersWithDetails = await Promise.all(
      topRevenueUsers.map(async (item) => {
        const userDetails = await prisma.user.findUnique({
          where: { id: item.userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        })
        return {
          ...userDetails,
          total_revenue: item._sum.amount,
          payment_count: item._count.id
        }
      })
    )

    // Collection rate analysis
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const [totalMonthlyFees, paidMonthlyFees] = await Promise.all([
      prisma.monthlyFee.count({
        where: {
          feeMonth: currentMonth
        }
      }),
      prisma.monthlyFee.count({
        where: {
          feeMonth: currentMonth,
          status: 'paid'
        }
      })
    ])

    const collectionRate = totalMonthlyFees > 0 ? (paidMonthlyFees / totalMonthlyFees) * 100 : 0

    return createResponse({
      overview: {
        total_revenue: totalRevenue._sum.amount || 0,
        monthly_fee_revenue: monthlyFeeRevenue._sum.amount || 0,
        order_revenue: orderRevenue._sum.amount || 0,
        booking_revenue: bookingRevenue._sum.amount || 0,
        pending_payments: pendingPayments._sum.amount || 0,
        collection_rate: collectionRate
      },
      trends: {
        monthly_revenue: monthlyRevenue
      },
      breakdown: {
        by_payment_method: revenueByPaymentMethod.map(item => ({
          payment_method: item.paymentMethod,
          total_amount: item._sum.amount || 0,
          transaction_count: item._count.id
        })),
        by_revenue_type: [
          {
            type: 'monthly_fees',
            amount: monthlyFeeRevenue._sum.amount || 0,
            percentage: totalRevenue._sum.amount ? 
              ((monthlyFeeRevenue._sum.amount || 0) / totalRevenue._sum.amount * 100) : 0
          },
          {
            type: 'orders',
            amount: orderRevenue._sum.amount || 0,
            percentage: totalRevenue._sum.amount ? 
              ((orderRevenue._sum.amount || 0) / totalRevenue._sum.amount * 100) : 0
          },
          {
            type: 'bookings',
            amount: bookingRevenue._sum.amount || 0,
            percentage: totalRevenue._sum.amount ? 
              ((bookingRevenue._sum.amount || 0) / totalRevenue._sum.amount * 100) : 0
          }
        ]
      },
      top_revenue_users: topUsersWithDetails
    })

  } catch (error) {
    console.error('Get revenue analytics error:', error)
    return createResponse(null, 'Failed to fetch revenue analytics', 500)
  }
}