import { prisma } from '@/lib/prisma'
import { successResponse, serverError } from '@/lib/response'

// GET /api/system/health - Health check
export async function GET(request) {
  try {
    const startTime = Date.now()
    
    // Check database connection
    let dbStatus = 'healthy'
    let dbResponseTime = 0
    
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      dbResponseTime = Date.now() - dbStart
    } catch (error) {
      dbStatus = 'unhealthy'
      console.error('Database health check failed:', error)
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage()
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100

    // Overall health status
    const isHealthy = dbStatus === 'healthy' && memoryUsagePercent < 90
    const status = isHealthy ? 'healthy' : 'unhealthy'

    const healthData = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      response_time: Date.now() - startTime,
      checks: {
        database: {
          status: dbStatus,
          response_time: dbResponseTime
        },
        memory: {
          status: memoryUsagePercent < 90 ? 'healthy' : 'warning',
          usage_percent: Math.round(memoryUsagePercent),
          heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024)
        },
        api: {
          status: 'healthy',
          version: '1.0.0'
        }
      }
    }

    const statusCode = isHealthy ? 200 : 503

    return new Response(JSON.stringify({
      success: isHealthy,
      data: healthData,
      message: isHealthy ? 'System is healthy' : 'System has issues',
      errors: null,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `health_${Date.now()}`
      }
    }), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Health check failed:', error)
    
    return new Response(JSON.stringify({
      success: false,
      data: null,
      message: 'Health check failed',
      errors: error.message,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `health_error_${Date.now()}`
      }
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}