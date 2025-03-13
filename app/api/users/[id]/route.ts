import { NextResponse } from "next/server"
import { cookies } from "next/headers"

// In a real app, you would use a database
// For demo purposes, we're using the same in-memory store
// This would be imported from a shared module in a real app
const users: any[] = []

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const userId = cookieStore.get("userId")?.value

    if (!userId) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const currentUser = users.find((u) => u.id === userId)
    if (!currentUser || (currentUser.role !== "admin" && currentUser.id !== params.id)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const user = users.find((u) => u.id === params.id)
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const userId = cookieStore.get("userId")?.value

    if (!userId) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const currentUser = users.find((u) => u.id === userId)
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const userIndex = users.findIndex((u) => u.id === params.id)
    if (userIndex === -1) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const { name, email, role } = await request.json()

    // Update user
    users[userIndex] = {
      ...users[userIndex],
      name: name || users[userIndex].name,
      email: email || users[userIndex].email,
      role: role || users[userIndex].role,
    }

    // Return updated user without password
    const { password: _, ...userWithoutPassword } = users[userIndex]
    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const userId = cookieStore.get("userId")?.value

    if (!userId) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const currentUser = users.find((u) => u.id === userId)
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Prevent deleting the current user
    if (params.id === userId) {
      return NextResponse.json({ message: "Cannot delete your own account" }, { status: 400 })
    }

    const userIndex = users.findIndex((u) => u.id === params.id)
    if (userIndex === -1) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Delete user
    users.splice(userIndex, 1)

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

