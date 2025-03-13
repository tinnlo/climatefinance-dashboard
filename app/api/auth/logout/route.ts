import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = cookies()

  // Clear session cookies
  cookieStore.delete("session")
  cookieStore.delete("userId")

  return NextResponse.json({ message: "Logged out successfully" })
}

