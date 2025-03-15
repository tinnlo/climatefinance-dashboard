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
  
  if (!session?.user?.id) {
    console.log("No session or user ID found in getCurrentUser")
    return null
  }
  
  const isSpecificUser = session.user.id === 'f02e6944-5016-45f1-ba11-31e4363ba60d' || 
                         session.user.email === 'tinnlo@proton.me';
  
  if (isSpecificUser) {
    console.log("Special user detected in getCurrentUser:", {
      id: session.user.id,
      email: session.user.email
    });
  }
  
  console.log(`Fetching user data for ID: ${session.user.id}`)
  
  try {
    // First try to get the user by ID
    const { data, error } = await supabase.from("users").select("*").eq("id", session.user.id).single()

    if (error) {
      console.error(`Error getting user by ID ${session.user.id}:`, error)
      
      // Special handling for the specific user
      if (isSpecificUser) {
        console.log("Special user not found by ID, trying to create");
        
        // Try to create the user
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert([
            {
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || "User",
              email: session.user.email,
              role: "user",
              is_verified: false,
            },
          ])
          .select();
        
        if (createError) {
          console.error("Error creating special user:", createError);
        } else if (newUser && newUser.length > 0) {
          console.log("Successfully created special user:", newUser[0]);
          return newUser[0];
        }
      }
      
      // If the error is "No rows found", let's try to get the user by email as a fallback
      if (error.message.includes("No rows found") && session.user.email) {
        console.log(`Trying to get user by email: ${session.user.email}`)
        const { data: userByEmail, error: emailError } = await supabase
          .from("users")
          .select("*")
          .eq("email", session.user.email)
          .single()
        
        if (emailError) {
          console.error(`Error getting user by email ${session.user.email}:`, emailError)
          return null
        }
        
        console.log(`Found user by email: ${userByEmail?.id}`)
        return userByEmail
      }
      
      return null
    }

    // Special handling for the specific user you mentioned
    if (isSpecificUser) {
      console.log("Found the specific user you mentioned:", data)
      
      // If the user exists but is_verified is null, set it to false
      if (data && data.is_verified === null) {
        console.log("User has null is_verified, updating to false")
        const { error: updateError } = await supabase
          .from("users")
          .update({ is_verified: false })
          .eq("id", data.id)
        
        if (updateError) {
          console.error("Error updating is_verified:", updateError)
        } else {
          data.is_verified = false
        }
      }
    }

    return data
  } catch (err) {
    console.error("Unexpected error in getCurrentUser:", err)
    return null
  }
}

// Helper function to get a user by ID (for admin purposes)
export const getUserById = async (userId: string) => {
  try {
    console.log(`Fetching user data for ID: ${userId}`)
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()
    
    if (error) {
      console.error(`Error getting user by ID ${userId}:`, error)
      return null
    }
    
    return data
  } catch (err) {
    console.error("Unexpected error in getUserById:", err)
    return null
  }
}

