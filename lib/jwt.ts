import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// Secret key for JWT signing and verification
// In production, use a strong secret from environment variables
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
)

// Additional secret for refresh tokens (should be different from main JWT_SECRET)
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-change-in-production'
)

// Token expiration times
const ACCESS_TOKEN_EXPIRES_IN = '15m' // Short-lived access token
const REFRESH_TOKEN_EXPIRES_IN = '7d' // Longer-lived refresh token

// Store for refresh tokens (would be a database in production)
// This is just for demo purposes - in a real app, use a database
const refreshTokenStore = new Map<string, { userId: string, expiresAt: number }>()

/**
 * Generate both access and refresh tokens for a user
 */
export async function generateTokens(payload: any) {
  // Generate a shorter-lived access token
  const accessToken = await new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
    .sign(JWT_SECRET)

  // Generate a longer-lived refresh token with minimal payload
  const refreshTokenId = uuidv4()
  const refreshToken = await new SignJWT({ 
    id: payload.id,
    jti: refreshTokenId, // JWT ID for this specific token
    type: 'refresh'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRES_IN)
    .sign(REFRESH_SECRET)

  // Store refresh token info (in a real app, this would go in a database)
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  refreshTokenStore.set(refreshTokenId, {
    userId: payload.id,
    expiresAt
  })

  return { accessToken, refreshToken }
}

/**
 * Generate a new access token from a valid refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    // Verify the refresh token
    const { payload } = await jwtVerify(refreshToken, REFRESH_SECRET)
    
    // Check token type
    if (payload.type !== 'refresh') {
      return null
    }
    
    // Get the refresh token ID
    const jti = payload.jti as string
    
    // Check if the refresh token exists in our store
    const storedToken = refreshTokenStore.get(jti)
    if (!storedToken) {
      return null
    }
    
    // Check if the token has expired in our store
    if (storedToken.expiresAt < Date.now()) {
      refreshTokenStore.delete(jti)
      return null
    }
    
    // Get the user ID from the token
    const userId = payload.id as string
    
    // In a real app, you would fetch the user data from the database
    // For this example, we'll just create a minimal payload
    const accessToken = await new SignJWT({ 
      id: userId,
      type: 'access'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
      .sign(JWT_SECRET)
    
    return accessToken
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

/**
 * Invalidate a refresh token (logout)
 */
export function invalidateRefreshToken(refreshToken: string) {
  try {
    const { payload } = jwtVerify(refreshToken, REFRESH_SECRET) as any
    const jti = payload.jti as string
    
    if (jti && refreshTokenStore.has(jti)) {
      refreshTokenStore.delete(jti)
      return true
    }
  } catch (error) {
    console.error('Error invalidating token:', error)
  }
  
  return false
}

/**
 * Generate a JWT token for a user (legacy function for backward compatibility)
 */
export async function generateToken(payload: any) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
    .sign(JWT_SECRET)

  return token
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch (error) {
    return null
  }
}

/**
 * Get the JWT token from request headers
 */
export function getTokenFromRequest(request: NextRequest) {
  // Check Authorization header first (Bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Fall back to checking cookies
  const cookieStore = request.cookies
  return cookieStore.get('token')?.value
}

/**
 * Set JWT tokens in response cookies and headers
 */
export function setTokenCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  // Set access token as cookie (for browsers)
  response.cookies.set({
    name: 'token',
    value: accessToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  })
  
  // Set refresh token as cookie (for browsers)
  response.cookies.set({
    name: 'refreshToken',
    value: refreshToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/api/auth/refresh', // Only sent to refresh endpoint for security
  })
  
  // Also set in the authorization header for API clients
  response.headers.set('Authorization', `Bearer ${accessToken}`)
  
  return response
}

/**
 * Set JWT token in response cookies and headers (legacy function for backward compatibility)
 */
export function setTokenCookie(response: NextResponse, token: string) {
  // Set as cookie (for browsers)
  response.cookies.set({
    name: 'token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes (match the new shorter expiration)
    path: '/',
  })
  
  // Also set in the authorization header for API clients
  response.headers.set('Authorization', `Bearer ${token}`)
  
  return response
}

/**
 * Get the current user from the JWT token in cookies
 */
export async function getCurrentUser() {
  const cookieStore = cookies()
  const token = cookieStore.get('token')?.value
  
  if (!token) {
    return null
  }
  
  const payload = await verifyToken(token)
  return payload
} 