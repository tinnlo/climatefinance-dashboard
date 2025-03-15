import { NextRequest, NextResponse } from "next/server"
import { refreshAccessToken, setTokenCookie } from "@/lib/jwt"

/**
 * Endpoint to refresh an access token using a refresh token
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value
    
    // If no refresh token, return error
    if (!refreshToken) {
      return NextResponse.json(
        { message: "Refresh token not provided" },
        { status: 401 }
      )
    }
    
    // Generate a new access token
    const newAccessToken = await refreshAccessToken(refreshToken)
    
    // If refresh failed, return error
    if (!newAccessToken) {
      return NextResponse.json(
        { message: "Invalid or expired refresh token" },
        { status: 401 }
      )
    }
    
    // Create response with new access token
    const response = NextResponse.json(
      { 
        message: "Token refreshed successfully",
        token: newAccessToken 
      }
    )
    
    // Set the new token in cookies
    setTokenCookie(response, newAccessToken)
    
    return response
  } catch (error) {
    console.error("Token refresh error:", error)
    return NextResponse.json(
      { message: "Failed to refresh token" },
      { status: 500 }
    )
  }
} 