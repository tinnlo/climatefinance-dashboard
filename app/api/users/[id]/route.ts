import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

// In a real app, you would use a database
// For demo purposes, we're using the same in-memory store
// This would be imported from a shared module in a real app
const users: any[] = []

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

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
    const userId = params.id
    console.log(`Attempting to delete user with ID: ${userId}`)

    // Try the most direct approach first - using a custom RPC function
    try {
      console.log(`Attempting to delete user ${userId} using direct RPC call`)
      const { error: directDeleteError } = await supabaseAdmin.rpc('delete_user_complete', { user_id: userId })
      
      if (!directDeleteError) {
        console.log(`Successfully deleted user ${userId} using direct RPC`)
        return NextResponse.json({ 
          success: true, 
          message: "User deleted successfully using direct method" 
        })
      }
      
      console.error("Direct delete method failed:", directDeleteError)
      // If direct method fails, continue with the fallback methods
    } catch (directError) {
      console.error("Exception in direct delete method:", directError)
      // Continue with fallback methods
    }

    // Fallback to the step-by-step approach
    // First, check if the user exists in auth.users
    const { data: authUser, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (authCheckError) {
      console.error("Error checking auth user:", authCheckError)
      return NextResponse.json(
        { error: `Failed to check if user exists: ${authCheckError.message}` },
        { status: 500 }
      )
    }

    if (!authUser || !authUser.user) {
      console.log(`User with ID ${userId} not found in auth.users table`)
      // If user doesn't exist in auth.users, just delete from public.users
      const { error: publicUserError } = await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", userId)

      if (publicUserError) {
        console.error("Error deleting from public.user:", publicUserError)
        return NextResponse.json(
          { error: `Failed to delete user from public.user table: ${publicUserError.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, message: "User deleted from public.users only" })
    }

    // If we get here, the user exists in auth.users, so delete from both tables
    
    // First, try to delete from auth.users using the admin API
    console.log(`Deleting user ${userId} from auth.users table using admin API`)
    const { error: authUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authUserError) {
      console.error("Error deleting from auth.user using admin API:", authUserError)
      
      // If admin API fails, try using a direct SQL query as a fallback
      // This is a more aggressive approach and should be used with caution
      console.log(`Attempting to delete user ${userId} using SQL query`)
      try {
        const { error: sqlError } = await supabaseAdmin.rpc('delete_user_auth', { user_id: userId })
        
        if (sqlError) {
          console.error("Error deleting user with SQL query:", sqlError)
          return NextResponse.json(
            { error: `Failed to delete user from auth.user table: ${authUserError.message}. SQL fallback also failed: ${sqlError.message}` },
            { status: 500 }
          )
        }
      } catch (sqlCatchError) {
        console.error("Exception in SQL delete fallback:", sqlCatchError)
        return NextResponse.json(
          { error: `Failed to delete user from auth.user table: ${authUserError.message}. SQL fallback exception: ${sqlCatchError instanceof Error ? sqlCatchError.message : 'Unknown error'}` },
          { status: 500 }
        )
      }
    }

    // Then, delete from public.users
    console.log(`Deleting user ${userId} from public.users table`)
    const { error: publicUserError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId)

    if (publicUserError) {
      console.error("Error deleting from public.user:", publicUserError)
      return NextResponse.json(
        { error: `Failed to delete user from public.user table: ${publicUserError.message}` },
        { status: 500 }
      )
    }

    console.log(`Successfully deleted user ${userId} from both tables`)
    return NextResponse.json({ success: true, message: "User deleted successfully from both tables" })
  } catch (error) {
    console.error("Error in DELETE user API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

