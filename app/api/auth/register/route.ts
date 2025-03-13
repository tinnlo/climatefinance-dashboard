import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

// In a real app, you would use a database
// This is a simple in-memory store for demonstration
const users: any[] = []

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Check if user already exists
    if (users.some((user) => user.email === email)) {
      return NextResponse.json({ message: "User already exists" }, { status: 409 })
    }

    // Create new user
    const newUser = {
      id: uuidv4(),
      name,
      email,
      password, // In a real app, you would hash this password
      role: "user" as const,
      createdAt: new Date().toISOString(),
    }

    users.push(newUser)

    // Return success without the password
    const { password: _, ...userWithoutPassword } = newUser
    return NextResponse.json({ message: "User registered successfully", user: userWithoutPassword }, { status: 201 })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

