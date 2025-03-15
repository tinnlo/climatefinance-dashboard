import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { generateTokens, setTokenCookies } from "@/lib/jwt"

// In a real app, you would use a database
// For demo purposes, we're using the same in-memory store
// This would be imported from a shared module in a real app
const users: any[] = []

// Add a default admin user if none exists
if (!users.some((user) => user.email === "admin@example.com")) {
  users.push({
    id: uuidv4(),
    name: "Admin User",
    email: "admin@example.com",
    password: "admin123", // In a real app, this would be hashed
    role: "admin",
    createdAt: new Date().toISOString(),
  })
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    // Find user
    const user = users.find((u) => u.email === email)
    if (!user || user.password !== password) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    // Remove sensitive data from user object before creating token
    const { password: _, ...userWithoutPassword } = user
    
    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
    
    // Prepare response
    const response = NextResponse.json({
      message: "Login successful",
      user: userWithoutPassword,
      token: accessToken, // For backward compatibility
      refreshToken, // Include refresh token in response for API clients
    })
    
    // Set tokens in cookies and headers
    setTokenCookies(response, accessToken, refreshToken)
    
    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

