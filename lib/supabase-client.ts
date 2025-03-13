import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Helper function to get the current session
export const getCurrentSession = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) {
    console.error("Error getting session:", error)
    return null
  }
  return session
}

// Helper function to get the current user with role
export const getCurrentUser = async () => {
  const session = await getCurrentSession()
  if (!session?.user?.id) return null

  const { data, error } = await supabase.from("users").select("*").eq("id", session.user.id).single()

  if (error) {
    console.error("Error getting user:", error)
    return null
  }

  return data
}

