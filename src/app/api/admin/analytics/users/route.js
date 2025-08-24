import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/admin/analytics/users - User statistics
export async function GET(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // User statistics
    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      usersByRole,
      usersByStatus,
      userRegistrationTrend
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({
        where: { createdAt: { gte: startOfMonth } }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfLastMonth,
            lt: startOfMonth
          }
        }
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true }
      }),
      prisma.user.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      // Last 6 months registration trend
      Promise.all(
        Array.from({ length: 6 }, async (_, i) => {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
          
          const count = await prisma.user.count({
            where: {
              createdAt: {
                gte: monthStart,
                lte: monthEnd
              }
            }
          })
          
          return {
            month: monthStart.toISOString().slice(0, 7),
            count
          }
        })
      ).then(results => results.reverse())
    ])

    // Recent user activities
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true
      }
    })

    // User engagement metrics
    const userEngagement = await Promise.all([
      prisma.order.groupBy({
        by: ['userId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      prisma.serviceRequest.groupBy({
        by: ['userId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      prisma.communityPost.groupBy({
        by: ['userId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      })
    ])

    return createResponse({
      overview: {
        total_users: totalUsers,
        active_users: activeUsers,
        inactive_users: totalUsers - activeUsers,
        new_users_this_month: newUsersThisMonth,
        new_users_last_month: newUsersLastMonth,
        growth_rate: newUsersLastMonth > 0 ? 
          ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100) : 0
      },
      demographics: {
        by_role: usersByRole.map(item => ({
          role: item.role,
          count: item._count.id
        })),
        by_status: usersByStatus.map(item => ({
          status: item.status,
          count: item._count.id
        }))
      },
      trends: {
        registration_trend: userRegistrationTrend
      },
      engagement: {
        top_buyers: userEngagement[0],
        top_service_requesters: userEngagement[1],
        top_community_contributors: userEngagement[2]
      },
      recent_users: recentUsers
    })

  } catch (error) {
    console.error('Get user analytics error:', error)
    return createResponse(null, 'Failed to fetch user analytics', 500)
  }
}