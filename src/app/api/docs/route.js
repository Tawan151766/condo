import { successResponse } from '@/lib/response'

// GET /api/docs - API Documentation
export async function GET(request) {
  try {
    const apiDocs = {
      title: 'Community Management System API',
      version: '1.0.0',
      description: 'Complete API documentation for the Community Management System',
      base_url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
      
      authentication: {
        type: 'Bearer Token (JWT)',
        header: 'Authorization: Bearer <token>',
        endpoints: {
          login: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
          refresh: 'POST /api/auth/refresh-token',
          logout: 'POST /api/auth/logout'
        }
      },

      endpoints: {
        authentication: [
          { method: 'POST', path: '/api/auth/login', description: 'User login' },
          { method: 'POST', path: '/api/auth/register', description: 'User registration' },
          { method: 'POST', path: '/api/auth/refresh-token', description: 'Refresh access token' },
          { method: 'POST', path: '/api/auth/forgot-password', description: 'Request password reset' },
          { method: 'POST', path: '/api/auth/reset-password', description: 'Reset password with OTP' },
          { method: 'POST', path: '/api/auth/verify-otp', description: 'Verify OTP' },
          { method: 'POST', path: '/api/auth/logout', description: 'User logout' }
        ],

        user_management: [
          { method: 'GET', path: '/api/users/profile', description: 'Get user profile' },
          { method: 'PUT', path: '/api/users/profile', description: 'Update user profile' },
          { method: 'PUT', path: '/api/users/change-password', description: 'Change password' },
          { method: 'GET', path: '/api/users', description: 'List all users (Admin)' },
          { method: 'POST', path: '/api/users', description: 'Create user (Admin)' },
          { method: 'GET', path: '/api/users/{id}', description: 'Get user details (Admin)' },
          { method: 'PUT', path: '/api/users/{id}', description: 'Update user (Admin)' },
          { method: 'DELETE', path: '/api/users/{id}', description: 'Delete user (Admin)' }
        ],

        buildings: [
          { method: 'GET', path: '/api/buildings', description: 'List all buildings' },
          { method: 'POST', path: '/api/buildings', description: 'Create building (Admin)' },
          { method: 'GET', path: '/api/buildings/{id}', description: 'Get building details' },
          { method: 'PUT', path: '/api/buildings/{id}', description: 'Update building (Admin)' },
          { method: 'DELETE', path: '/api/buildings/{id}', description: 'Delete building (Admin)' },
          { method: 'GET', path: '/api/buildings/{building_id}/units', description: 'List units in building' },
          { method: 'POST', path: '/api/buildings/{building_id}/units', description: 'Create unit (Admin)' }
        ],

        products: [
          { method: 'GET', path: '/api/products/categories', description: 'List product categories' },
          { method: 'POST', path: '/api/products/categories', description: 'Create category (Admin)' },
          { method: 'GET', path: '/api/products', description: 'List products with filters' },
          { method: 'POST', path: '/api/products', description: 'Create product (Admin)' }
        ],

        shopping_cart: [
          { method: 'GET', path: '/api/cart', description: 'Get user cart' },
          { method: 'DELETE', path: '/api/cart', description: 'Clear cart' },
          { method: 'POST', path: '/api/cart/items', description: 'Add item to cart' },
          { method: 'PUT', path: '/api/cart/items/{id}', description: 'Update cart item' },
          { method: 'DELETE', path: '/api/cart/items/{id}', description: 'Remove cart item' }
        ],

        orders: [
          { method: 'GET', path: '/api/orders', description: 'Get user orders' },
          { method: 'POST', path: '/api/orders', description: 'Create new order' }
        ],

        services: [
          { method: 'GET', path: '/api/services/categories', description: 'List service categories' },
          { method: 'POST', path: '/api/services/categories', description: 'Create service category (Admin)' },
          { method: 'GET', path: '/api/service-requests', description: 'Get user service requests' },
          { method: 'POST', path: '/api/service-requests', description: 'Create service request' }
        ],

        announcements: [
          { method: 'GET', path: '/api/announcements', description: 'List announcements' },
          { method: 'POST', path: '/api/announcements', description: 'Create announcement (Admin)' },
          { method: 'POST', path: '/api/announcements/{id}/read', description: 'Mark announcement as read' },
          { method: 'GET', path: '/api/announcements/unread-count', description: 'Get unread count' }
        ],

        notifications: [
          { method: 'GET', path: '/api/notifications', description: 'List user notifications' },
          { method: 'DELETE', path: '/api/notifications', description: 'Clear all notifications' },
          { method: 'PUT', path: '/api/notifications/{id}/read', description: 'Mark notification as read' },
          { method: 'PUT', path: '/api/notifications/read-all', description: 'Mark all as read' },
          { method: 'GET', path: '/api/notifications/unread-count', description: 'Get unread count' }
        ],

        search: [
          { method: 'GET', path: '/api/search', description: 'Global search' }
        ],

        system: [
          { method: 'GET', path: '/api/system/info', description: 'System information' },
          { method: 'GET', path: '/api/system/health', description: 'Health check' },
          { method: 'GET', path: '/api/settings/public', description: 'Public settings' }
        ]
      },

      response_format: {
        success: {
          success: true,
          data: '{}',
          message: 'Operation completed successfully',
          errors: null,
          meta: {
            timestamp: '2024-02-01T10:30:00Z',
            request_id: 'req_123456789'
          }
        },
        error: {
          success: false,
          data: null,
          message: 'Operation failed',
          errors: {
            field: ['Error message']
          },
          meta: {
            timestamp: '2024-02-01T10:30:00Z',
            request_id: 'req_123456789'
          }
        }
      },

      status_codes: {
        200: 'OK - Success',
        201: 'Created - Resource created',
        400: 'Bad Request - Validation error',
        401: 'Unauthorized - Authentication required',
        403: 'Forbidden - Access denied',
        404: 'Not Found - Resource not found',
        429: 'Too Many Requests - Rate limit exceeded',
        500: 'Internal Server Error - Server error'
      },

      pagination: {
        format: {
          total: 150,
          per_page: 20,
          current_page: 1,
          total_pages: 8,
          has_next: true,
          has_previous: false
        }
      }
    }

    return successResponse(apiDocs, 'API documentation retrieved successfully')

  } catch (error) {
    console.error('Error fetching API docs:', error)
    return serverError('Failed to fetch API documentation')
  }
}