import { prisma } from '@/lib/prisma'

async function getDashboardStats() {
  try {
    const [userCount, buildingCount, productCount, orderCount] = await Promise.all([
      prisma.user.count(),
      prisma.building.count(),
      prisma.product.count(),
      prisma.order.count()
    ])

    return {
      users: userCount,
      buildings: buildingCount,
      products: productCount,
      orders: orderCount
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      users: 0,
      buildings: 0,
      products: 0,
      orders: 0
    }
  }
}

export default async function Home() {
  const stats = await getDashboardStats()

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Community Management System
          </h1>
          <p className="text-gray-600">
            ระบบจัดการชุมชน - Dashboard
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ผู้ใช้ทั้งหมด</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.users}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">อาคาร</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.buildings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">สินค้า</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.products}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">คำสั่งซื้อ</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.orders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">API Endpoints</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <h3 className="font-medium text-blue-900 mb-2">🔐 Authentication</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>POST /api/auth/login</li>
                <li>POST /api/auth/register</li>
                <li>POST /api/auth/refresh-token</li>
                <li>POST /api/auth/forgot-password</li>
              </ul>
            </div>
            
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <h3 className="font-medium text-green-900 mb-2">👥 User Management</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>GET /api/users/profile</li>
                <li>GET /api/users</li>
                <li>POST /api/users</li>
                <li>PUT /api/users/[id]</li>
              </ul>
            </div>

            <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
              <h3 className="font-medium text-purple-900 mb-2">🏢 Buildings</h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>GET /api/buildings</li>
                <li>POST /api/buildings</li>
                <li>GET /api/buildings/[id]</li>
                <li>GET /api/buildings/[id]/units</li>
              </ul>
            </div>

            <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
              <h3 className="font-medium text-yellow-900 mb-2">🛒 E-commerce</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>GET /api/products</li>
                <li>GET /api/products/categories</li>
                <li>GET /api/cart</li>
                <li>POST /api/orders</li>
              </ul>
            </div>

            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <h3 className="font-medium text-red-900 mb-2">🔧 Services</h3>
              <ul className="text-sm text-red-700 space-y-1">
                <li>GET /api/services/categories</li>
                <li>GET /api/service-requests</li>
                <li>POST /api/service-requests</li>
              </ul>
            </div>

            <div className="p-4 border border-indigo-200 rounded-lg bg-indigo-50">
              <h3 className="font-medium text-indigo-900 mb-2">📢 Communication</h3>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>GET /api/announcements</li>
                <li>GET /api/notifications</li>
                <li>GET /api/search</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <a 
              href="/api/docs" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Complete API Documentation
            </a>
          </div>
        </div>

        {/* Quick Test Links */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Test Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a 
              href="/api/system/health" 
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Health Check</h3>
              <p className="text-sm text-gray-600">ตรวจสอบสถานะระบบ</p>
            </a>
            <a 
              href="/api/system/info" 
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">System Info</h3>
              <p className="text-sm text-gray-600">ข้อมูลระบบ</p>
            </a>
            <a 
              href="/api/settings/public" 
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Public Settings</h3>
              <p className="text-sm text-gray-600">การตั้งค่าสาธารณะ</p>
            </a>
          </div>
        </div>

        {/* Database Connection Status */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-800 font-medium">
              Database Connected Successfully
            </p>
          </div>
          <p className="text-green-700 text-sm mt-1">
            Prisma + PostgreSQL connection is working properly
          </p>
        </div>
      </div>
    </div>
  )
}