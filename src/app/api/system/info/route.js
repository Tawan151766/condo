import { successResponse } from '@/lib/response'

// GET /api/system/info - System information
export async function GET(request) {
  try {
    const systemInfo = {
      app_name: process.env.NEXT_PUBLIC_APP_NAME || 'Community Management System',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      api_version: 'v1',
      server_time: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      node_version: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory_usage: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap_used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heap_total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      }
    }

    return successResponse(systemInfo, 'System information retrieved successfully')

  } catch (error) {
    console.error('Error fetching system info:', error)
    return serverError('Failed to fetch system information')
  }
}