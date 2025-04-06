"use client"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

// Create a singleton instance for client-side usage
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (supabaseInstance) return supabaseInstance
  
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'supabase.auth.token',
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      detectSessionInUrl: true,
      flowType: 'implicit',
      // Set longer token window to prevent frequent expirations
      debug: process.env.NODE_ENV === 'development'
    },
    global: {
      fetch: (url, options) => {
        // Add request timeout of 30 seconds to all Supabase API calls
        const controller = new AbortController();
        const { signal } = controller;
        
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 30000); // 30 second timeout
        
        return fetch(url, { ...options, signal })
          .finally(() => {
            clearTimeout(timeoutId);
          });
      }
    }
  })
  
  // Set up auth state change listener for debugging and better token management
  if (typeof window !== 'undefined') {
    supabaseInstance.auth.onAuthStateChange((event, session) => {
      // Log auth events for debugging
      console.log(`[Supabase Auth] Event: ${event}`, { 
        hasSession: !!session,
        timestamp: new Date().toISOString(),
      });
      
      // Refresh the token more aggressively when it's about to expire
      if (session && event === 'TOKEN_REFRESHED') {
        console.log('[Supabase Auth] Token refreshed successfully');
      }
    });
  }
  
  return supabaseInstance
}

// For backward compatibility
export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null

// Helper function to get the current session (client-side only)
export const getCurrentSession = async () => {
  if (typeof window === 'undefined') return null
  
  const client = getSupabaseClient()
  try {
    // Add timeout for getSession request to prevent hangs
    const sessionPromise = client.auth.getSession()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Session request timed out")), 15000)
    )
    
    const {
      data: { session },
      error,
    } = await Promise.race([sessionPromise, timeoutPromise]) as any
    
    if (error) {
      console.error("Error getting session:", error)
      return null
    }
    
    return session
  } catch (error) {
    console.error("Unexpected error in getCurrentSession:", error)
    return null
  }
}

// Helper function to get the current user with role (client-side only)
export interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at?: string;
  is_verified?: boolean;
  [key: string]: any; // For any other properties
}

export const getCurrentUser = async () => {
  if (typeof window === 'undefined') return null
  
  try {
    const session = await getCurrentSession()
    
    if (!session?.user?.id) {
      console.log("No session or user ID found in getCurrentUser")
      return null
    }
    
    console.log(`Fetching user data for ID: ${session.user.id}`)
    
    const client = getSupabaseClient()
    // Get the user by ID
    const { data, error } = await client.from("users").select("*").eq("id", session.user.id).single()

    if (error) {
      console.error(`Error getting user by ID ${session.user.id}:`, error)
      
      // If the error is "No rows found", let's try to get the user by email as a fallback
      if (error.message.includes("No rows found") && session.user.email) {
        console.log(`Trying to get user by email: ${session.user.email}`)
        const { data: userByEmail, error: emailError } = await client
          .from("users")
          .select("*")
          .eq("email", session.user.email)
          .single()
        
        if (emailError) {
          console.error(`Error getting user by email ${session.user.email}:`, emailError)
          return null
        }
        
        // Type assertion for userByEmail
        const typedUserByEmail = userByEmail as UserData
        
        // Normalize is_verified to a consistent boolean value
        if (typedUserByEmail) {
          // Check the actual value and convert it to a proper boolean
          const verificationValue = typedUserByEmail.is_verified;
          console.log(`Raw verification value for user ${typedUserByEmail.email}:`, verificationValue, 
            `(type: ${typeof verificationValue})`);
          
          // Convert to boolean using multiple checks
          let boolValue = false;
          
          if (verificationValue === true) {
            boolValue = true;
          } else if (typeof verificationValue === 'number' && verificationValue === 1) {
            boolValue = true;
          } else if (typeof verificationValue === 'string') {
            const stringValue = verificationValue as string;
            if (stringValue === '1' || stringValue.toLowerCase() === 'true') {
              boolValue = true;
            }
          }
          
          console.log(`Converted verification value to: ${boolValue}`);
          
          // Set the normalized boolean value
          typedUserByEmail.is_verified = boolValue;
        }
        
        console.log(`Found user by email: ${typedUserByEmail?.id}, normalized verification status:`, 
          typedUserByEmail?.is_verified);
        
        // Store the current user identity in local storage for verification consistency
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('current_user_email', session.user.email);
            localStorage.setItem('current_user_id', typedUserByEmail.id);
          }
        } catch (e) {
          console.error("Error storing user identity:", e);
        }
        
        return typedUserByEmail
      }
      
      return null
    }
    
    // Type assertion for data
    const typedData = data as UserData
    
    // Normalize is_verified to a consistent boolean value
    if (typedData) {
      // Check the actual value and convert it to a proper boolean
      const verificationValue = typedData.is_verified;
      console.log(`Raw verification value for user ${typedData.email}:`, verificationValue, 
        `(type: ${typeof verificationValue})`);
      
      // Convert to boolean using multiple checks
      let boolValue = false;
      
      if (verificationValue === true) {
        boolValue = true;
      } else if (typeof verificationValue === 'number' && verificationValue === 1) {
        boolValue = true;
      } else if (typeof verificationValue === 'string') {
        const stringValue = verificationValue as string;
        if (stringValue === '1' || stringValue.toLowerCase() === 'true') {
          boolValue = true;
        }
      }
      
      console.log(`Converted verification value to: ${boolValue}`);
      
      // Set the normalized boolean value
      typedData.is_verified = boolValue;
    }
    
    console.log(`Found user by ID: ${typedData?.id}, normalized verification status:`, typedData?.is_verified)
    
    // Store the current user identity in local storage for verification consistency
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_user_email', session.user.email);
        localStorage.setItem('current_user_id', typedData.id);
      }
    } catch (e) {
      console.error("Error storing user identity:", e);
    }
    
    return typedData
  } catch (error) {
    console.error("Unexpected error in getCurrentUser:", error)
    return null
  }
}

// Helper function to get a user by ID (for admin purposes)
export const getUserById = async (userId: string) => {
  if (typeof window === 'undefined') return null
  
  try {
    const client = getSupabaseClient()
    console.log(`Fetching user data for ID: ${userId}`)
    const { data, error } = await client.from("users").select("*").eq("id", userId).single()
    
    if (error) {
      console.error(`Error getting user by ID ${userId}:`, error)
      return null
    }
    
    return data as UserData
  } catch (error) {
    console.error("Unexpected error in getUserById:", error)
    return null
  }
}

