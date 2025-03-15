import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/jwt"

// In a real app, you would use a database
// For demo purposes, we're using the same in-memory store
// This would be imported from a shared module in a real app
const users: any[] = []

export async function GET() {
  try {
    // Get user from JWT token
    const payload = await getCurrentUser()

    if (!payload) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    // In a real application, you'd fetch the user data from your database
    // using the ID from the JWT payload
    const userId = payload.id
    const user = users.find((u) => u.id === userId)

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

