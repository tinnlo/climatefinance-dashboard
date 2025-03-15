import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/jwt"

// In a real app, you would use a database
// For demo purposes, we're using the same in-memory store
// This would be imported from a shared module in a real app
const users = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Regular User",
    email: "user@example.com",
    role: "user",
    createdAt: new Date().toISOString(),
  },
]

export async function GET(request: Request) {
  try {
    // Get user from JWT token
    const payload = await getCurrentUser()

    if (!payload) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    // In a real application, you'd check roles in your database
    if (payload.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Return all users (no need to remove passwords as our user objects don't have them)
    return NextResponse.json({ users })
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

