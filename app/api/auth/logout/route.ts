import { NextRequest, NextResponse } from "next/server"
import { invalidateRefreshToken } from "@/lib/jwt"

/**
 * Endpoint to log out a user by invalidating their refresh token and clearing cookies
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value
    
    // Create response
    const response = NextResponse.json(
      { message: "Logged out successfully" }
    )
    
    // Clear auth cookies
    response.cookies.set({
      name: 'token',
      value: '',
      httpOnly: true,
      expires: new Date(0), // Expire immediately
      path: '/',
    })
    
    response.cookies.set({
      name: 'refreshToken',
      value: '',
      httpOnly: true,
      expires: new Date(0), // Expire immediately
      path: '/api/auth/refresh',
    })
    
    // If refresh token exists, invalidate it
    if (refreshToken) {
      invalidateRefreshToken(refreshToken)
    }
    
    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { message: "An error occurred during logout" },
      { status: 500 }
    )
  }
}

