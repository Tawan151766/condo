import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/admin/analytics/dashboard - Main dashboard data
export async function GET(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Overview statistics
    const [
      totalResidents,
      activeServiceRequests,
      monthlyRevenue,
      lastMonthRevenue,
      pendingPayments,
      totalBookings,
      activePosts
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'resident', is_active: true } }),
      prisma.serviceRequest.count({ where: { status: { in: ['pending', 'in_progress'] } } }),
      prisma.payment.aggregate({
        where: {
          status: 'completed',
          payment_date: { gte: startOfMonth }
        },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'completed',
          payment_date: { gte: startOfLastMonth, lte: endOfLastMonth }
        },
        _sum: { amount: true }
      }),
      prisma.monthlyFee.count({ where: { status: 'pending' } }),
      prisma.booking.count({
        where: {
          booking_date: { gte: now },
          status: { in: ['confirmed', 'pending'] }
        }
      }),
      prisma.communityPost.count({ where: { is_active: true } })
    ])

    // Payment collection rate
    const totalMonthlyFees = await prisma.monthlyFee.count({
      where: {
        year: now.getFullYear(),
        month: now.getMonth() + 1
      }
    })
    const paidMonthlyFees = await prisma.monthlyFee.count({
      where: {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        status: 'paid'
      }
    })
    const paymentCollectionRate = totalMonthlyFees > 0 ? paidMonthlyFees / totalMonthlyFees : 0

    // Monthly revenue chart (last 6 months)
    const monthlyRevenueChart = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const revenue = await prisma.payment.aggregate({
        where: {
          status: 'completed',
          payment_date: { gte: monthStart, lte: monthEnd }
        },
        _sum: { amount: true }
      })
      
      monthlyRevenueChart.push({
        month: monthStart.toISOString().slice(0, 7),
        amount: revenue._sum.amount || 0
      })
    }

    // Service requests by category
    const serviceRequestsByCategory = await prisma.serviceRequest.groupBy({
      by: ['category_id'],
      _count: { id: true },
      include: {
        category: {
          select: { name: true }
        }
      }
    })

    // Recent activities
    const recentActivities = await Promise.all([
      prisma.serviceRequest.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { first_name: true, last_name: true } },
          category: { select: { name: true } }
        }
      }),
      prisma.booking.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { first_name: true, last_name: true } },
          facility: { select: { name: true } }
        }
      })
    ])

    return createResponse({
      overview: {
        total_residents: totalResidents,
        active_service_requests: activeServiceRequests,
        monthly_revenue: monthlyRevenue._sum.amount || 0,
        last_month_revenue: lastMonthRevenue._sum.amount || 0,
        revenue_change: lastMonthRevenue._sum.amount ? 
          ((monthlyRevenue._sum.amount || 0) - (lastMonthRevenue._sum.amount || 0)) / (lastMonthRevenue._sum.amount || 1) * 100 : 0,
        payment_collection_rate: paymentCollectionRate,
        pending_payments: pendingPayments,
        total_bookings: totalBookings,
        active_posts: activePosts
      },
      charts: {
        monthly_revenue: monthlyRevenueChart,
        service_requests_by_category: serviceRequestsByCategory.map(item => ({
          category: item.category?.name || 'Unknown',
          count: item._count.id
        }))
      },
      recent_activities: {
        service_requests: recentActivities[0],
        bookings: recentActivities[1]
      }
    })

  } catch (error) {
    console.error('Get dashboard analytics error:', error)
    return createResponse(null, 'Failed to fetch dashboard analytics', 500)
  }
}