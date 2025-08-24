import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

// Hash password
export async function hashPassword(password) {
  return await bcrypt.hash(password, 12)
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword)
}

// Generate JWT tokens
export function generateTokens(payload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN 
  })
  
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN 
  })

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600 // 1 hour in seconds
  }
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Verify refresh token
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET)
  } catch (error) {
    throw new Error('Invalid refresh token')
  }
}

// Extract token from Authorization header
export function extractToken(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

// Generate OTP
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Role-based access control
export function hasPermission(userRole, requiredRoles) {
  if (!Array.isArray(requiredRoles)) {
    requiredRoles = [requiredRoles]
  }
  return requiredRoles.includes(userRole)
}

// Middleware for authentication
export async function authenticate(request) {
  const token = extractToken(request)
  if (!token) {
    throw new Error('Authentication required')
  }

  try {
    const decoded = verifyToken(token)
    return decoded
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

// Middleware for authorization
export function authorize(requiredRoles) {
  return (user) => {
    if (!hasPermission(user.role, requiredRoles)) {
      throw new Error('Insufficient permissions')
    }
    return true
  }
}