import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from '@supabase/ssr'

// In a real app, you would use a database
// For demo purposes, we're using the same in-memory store
// This would be imported from a shared module in a real app
const users: any[] = []

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Check if the required environment variables are set
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
) : null

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check if supabaseAdmin is initialized
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin client not initialized. Missing environment variables." },
        { status: 500 }
      )
    }

    // Create a Supabase client using cookies for the current user's session
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // This is a read-only operation, so we don't need to set cookies
          },
        },
      }
    )

    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    // Get the current user's data to check their role
    const { data: currentUser, error: currentUserError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", session.user.id)
      .single()

    if (currentUserError || !currentUser) {
      console.error("Error getting current user:", currentUserError)
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Check if the user is authorized to view this user
    // Only admins can view other users' data
    if (currentUser.role !== "admin" && currentUser.id !== params.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Get the requested user's data
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", params.id)
      .single()

    if (userError || !user) {
      console.error("Error getting user:", userError)
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check if supabaseAdmin is initialized
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin client not initialized. Missing environment variables." },
        { status: 500 }
      )
    }

    // Create a Supabase client using cookies for the current user's session
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // This is a read-only operation, so we don't need to set cookies
          },
        },
      }
    )

    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    // Get the current user's data to check their role
    const { data: currentUser, error: currentUserError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", session.user.id)
      .single()

    if (currentUserError || !currentUser) {
      console.error("Error getting current user:", currentUserError)
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Only admins can update user data
    if (currentUser.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Check if the user exists
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", params.id)
      .single()

    if (existingUserError || !existingUser) {
      console.error("Error checking if user exists:", existingUserError)
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Get the updated user data from the request
    const { name, email, role, is_verified } = await request.json()

    // Update the user
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        name: name,
        email: email,
        role: role,
        is_verified: is_verified
      })
      .eq("id", params.id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating user:", updateError)
      return NextResponse.json(
        { error: `Failed to update user: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id
    console.log(`Attempting to delete user with ID: ${userId}`)

    // Check if supabaseAdmin is initialized
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin client not initialized. Missing environment variables." },
        { status: 500 }
      )
    }

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