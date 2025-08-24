import { jsonResponse } from './utils'

// Standard API response format
export function apiResponse(data = null, message = null, success = true, meta = {}) {
  return {
    success,
    data,
    message,
    errors: success ? null : data,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: generateRequestId(),
      ...meta
    }
  }
}

// Success response
export function successResponse(data, message = 'Operation completed successfully', meta = {}) {
  return jsonResponse(apiResponse(data, message, true, meta))
}

// Error response
export function errorResponse(errors, message = 'Operation failed', statusCode = 400, meta = {}) {
  return jsonResponse(
    apiResponse(errors, message, false, meta),
    { status: statusCode }
  )
}

// Validation error response
export function validationError(errors, message = 'Validation failed') {
  return errorResponse(errors, message, 400)
}

// Authentication error response
export function authError(message = 'Authentication required') {
  return errorResponse(null, message, 401)
}

// Authorization error response
export function forbiddenError(message = 'Access denied') {
  return errorResponse(null, message, 403)
}

// Not found error response
export function notFoundError(message = 'Resource not found') {
  return errorResponse(null, message, 404)
}

// Server error response
export function serverError(message = 'Internal server error') {
  return errorResponse(null, message, 500)
}

// Rate limit error response
export function rateLimitError(message = 'Too many requests') {
  return errorResponse(null, message, 429)
}

// Pagination response
export function paginatedResponse(data, pagination, message = 'Data retrieved successfully') {
  return successResponse(data, message, { pagination })
}

// Generate unique request ID
function generateRequestId() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}