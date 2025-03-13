import { NextResponse } from "next/server"
import { cookies } from "next/headers"

// In a real app, you would use a database
// For demo purposes, we're using the same in-memory store
// This would be imported from a shared module in a real app
const users: any[] = []

export async function GET() {
  try {
    const cookieStore = cookies()
    const userId = cookieStore.get("userId")?.value

    if (!userId) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

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

