import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/admin/reports/financial - Financial reports
export async function GET(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'monthly' // monthly, quarterly, yearly
    const year = parseInt(searchParams.get('year')) || new Date().getFullYear()
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')) : null
    const building_id = searchParams.get('building_id')

    let dateRange = {}
    let groupBy = []

    if (period === 'monthly' && month) {
      dateRange = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1)
      }
      groupBy = ['paymentDate']
    } else if (period === 'yearly') {
      dateRange = {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1)
      }
      groupBy = ['paymentDate']
    } else {
      // Default to current year
      dateRange = {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1)
      }
    }

    // Revenue summary
    const [
      totalRevenue,
      monthlyFeeRevenue,
      orderRevenue,
      bookingRevenue,
      totalPayments,
      pendingPayments,
      overduePayments
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          status: 'confirmed',
          paymentDate: dateRange
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'confirmed',
          paymentType: 'monthly_fee',
          paymentDate: dateRange
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'confirmed',
          paymentType: 'product_order',
          paymentDate: dateRange
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'confirmed',
          paymentType: 'facility_booking',
          paymentDate: dateRange
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.payment.count({
        where: {
          paymentDate: dateRange
        }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'pending'
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.monthlyFee.aggregate({
        where: {
          status: 'overdue',
          feeMonth: dateRange
        },
        _sum: { totalAmount: true },
        _count: { id: true }
      })
    ])

    // Monthly breakdown for the year
    const monthlyBreakdown = []
    for (let m = 1; m <= 12; m++) {
      const monthStart = new Date(year, m - 1, 1)
      const monthEnd = new Date(year, m, 0)
      
      const monthRevenue = await prisma.payment.aggregate({
        where: {
          status: 'confirmed',
          paymentDate: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        _sum: { amount: true }
      })
      
      monthlyBreakdown.push({
        month: m,
        month_name: monthStart.toLocaleDateString('th-TH', { month: 'long' }),
        revenue: monthRevenue._sum.amount || 0
      })
    }

    // Payment method breakdown
    const paymentMethodBreakdown = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: {
        status: 'confirmed',
        paymentDate: dateRange
      },
      _sum: { amount: true },
      _count: { id: true }
    })

    // Collection rate analysis
    const collectionAnalysis = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const monthDate = new Date(year, i, 1)
        
        const [totalFees, paidFees] = await Promise.all([
          prisma.monthlyFee.count({
            where: {
              feeMonth: monthDate,
              ...(building_id && {
                unit: {
                  buildingId: parseInt(building_id)
                }
              })
            }
          }),
          prisma.monthlyFee.count({
            where: {
              feeMonth: monthDate,
              status: 'paid',
              ...(building_id && {
                unit: {
                  buildingId: parseInt(building_id)
                }
              })
            }
          })
        ])
        
        return {
          month: i + 1,
          month_name: monthDate.toLocaleDateString('th-TH', { month: 'long' }),
          total_fees: totalFees,
          paid_fees: paidFees,
          collection_rate: totalFees > 0 ? (paidFees / totalFees * 100) : 0
        }
      })
    )

    // Top paying units/residents
    const topPayers = await prisma.payment.groupBy({
      by: ['userId'],
      where: {
        status: 'confirmed',
        paymentDate: dateRange
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      },
      take: 10
    })

    // Get user details for top payers
    const topPayersWithDetails = await Promise.all(
      topPayers.map(async (payer) => {
        const userDetails = await prisma.user.findUnique({
          where: { id: payer.userId },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            residents: {
              include: {
                unit: {
                  include: {
                    building: {
                      select: {
                        name: true,
                        code: true
                      }
                    }
                  }
                }
              }
            }
          }
        })
        
        return {
          user: userDetails,
          total_paid: payer._sum.amount,
          payment_count: payer._count.id
        }
      })
    )

    return createResponse({
      summary: {
        period,
        year,
        month,
        total_revenue: totalRevenue._sum.amount || 0,
        total_payments: totalPayments,
        monthly_fee_revenue: monthlyFeeRevenue._sum.amount || 0,
        order_revenue: orderRevenue._sum.amount || 0,
        booking_revenue: bookingRevenue._sum.amount || 0,
        pending_payments: {
          amount: pendingPayments._sum.amount || 0,
          count: pendingPayments._count.id || 0
        },
        overdue_payments: {
          amount: overduePayments._sum.totalAmount || 0,
          count: overduePayments._count.id || 0
        }
      },
      monthly_breakdown: monthlyBreakdown,
      payment_method_breakdown: paymentMethodBreakdown.map(item => ({
        method: item.paymentMethod,
        amount: item._sum.amount || 0,
        count: item._count.id,
        percentage: totalRevenue._sum.amount ? 
          ((item._sum.amount || 0) / totalRevenue._sum.amount * 100) : 0
      })),
      collection_analysis: collectionAnalysis,
      top_payers: topPayersWithDetails
    })

  } catch (error) {
    console.error('Get financial report error:', error)
    return createResponse(null, 'Failed to generate financial report', 500)
  }
}