"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback, Suspense } from "react"
import { getSupabaseClient, getCurrentUser } from "@/lib/supabase-client"
import { useRouter, usePathname } from "next/navigation"
import { useSearchParamsContext } from "@/app/components/SearchParamsProvider"

export interface User {
  id: string
  name: string
  email: string
  role: "user" | "admin"
  created_at?: string
  isVerified: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string, isAuthCheck?: boolean) => Promise<{ success: boolean; message: string; redirectTo?: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  isAuthenticated: boolean
  refreshSession: () => Promise<void>
  sessionExpiredMessage: string | null
  clearSessionExpiredMessage: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create a session storage key to track login state
const SESSION_STORAGE_KEY = 'auth_session_active'

// Inner component that uses search params
function AuthProviderContent({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParamsContext()
  const supabase = getSupabaseClient()

  const logAuthState = (action: string, data: any) => {
    console.log(`[Auth Debug - ${action}]`, {
      ...data,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'server-side',
    })
  }

  // Helper to store session state in localStorage (changed from sessionStorage for persistence)
  const setSessionActive = (active: boolean) => {
    if (typeof window !== 'undefined') {
      if (active) {
        localStorage.setItem(SESSION_STORAGE_KEY, 'true')
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    }
  }

  // Helper to check if session is active in localStorage
  const isSessionActive = (): boolean => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SESSION_STORAGE_KEY) === 'true'
    }
    return false
  }

  const clearSessionExpiredMessage = useCallback(() => {
    setSessionExpiredMessage(null)
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        clearSessionExpiredMessage()
        // This is an auth check, not a user-initiated login
        const result = await login(session.user.email ?? "", "", true)
        
        if (result.success) {
          setIsAuthenticated(true)
          setSessionActive(true)
        } else {
          setIsAuthenticated(false)
          setSessionActive(false)
        }
      } else {
        setIsAuthenticated(false)
        setSessionActive(false)
      }
    } catch (error) {
      logAuthState('Refresh Session Error', { error })
      setIsAuthenticated(false)
      setSessionActive(false)
    } finally {
      setIsLoading(false)
    }
  }, [clearSessionExpiredMessage])

  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true

    const initializeAuth = async () => {
      try {
        logAuthState('Initialize', 'Starting auth initialization...')
        
        // Check if we have an active session in localStorage
        const sessionActive = isSessionActive()
        logAuthState('Session Storage Check', { sessionActive })
        
        const { data: { session }, error } = await supabase.auth.getSession()
        logAuthState('Session Check', { session, error })

        if (error) throw error

        if (session?.user && mounted) {
          const userData = await getCurrentUser()
          if (userData) {
            // Check if the user is verified
            if (!userData.is_verified) {
              logAuthState('Unverified User Session Found', { 
                email: userData.email, 
                id: userData.id 
              });
              
              // Sign out unverified users
              await supabase.auth.signOut();
              setUser(null);
              setIsAuthenticated(false);
              setSessionActive(false);
              return;
            }
            
            const userState: User = {
              id: String(userData.id),
              name: String(userData.name),
              email: String(userData.email),
              role: userData.role as "user" | "admin",
              created_at: userData.created_at ? String(userData.created_at) : undefined,
              isVerified: Boolean(userData.is_verified),
            }
            setUser(userState)
            setIsAuthenticated(true)
            setSessionActive(true)
            logAuthState('User State Updated', { user: userState })
            clearSessionExpiredMessage()
          }
        } else if (sessionActive && mounted) {
          // If localStorage says we're active but we don't have a session, IT'S EXPIRED!
          logAuthState('Session Mismatch - Likely Expired', { sessionActive, hasSession: !!session })
          setSessionExpiredMessage("Your session has expired. Please log in again.")
          await refreshSession()
        } else if (mounted) {
           // No active session in storage and no session from Supabase
           clearSessionExpiredMessage();
        }
      } catch (error) {
        logAuthState('Initialize Error', error)
        if (mounted) {
          setUser(null)
          setIsAuthenticated(false)
          setSessionActive(false)
          clearSessionExpiredMessage()
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logAuthState('Auth State Change', { event, session })

      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsAuthenticated(false)
        setSessionActive(false)
        return
      }

      if (session?.user) {
        try {
          const userData = await getCurrentUser()
          if (userData) {
            // Check if the user is verified
            if (!userData.is_verified && event === 'SIGNED_IN') {
              logAuthState('Unverified User Attempted Login', { 
                email: userData.email, 
                id: userData.id 
              });
              
              // Sign out unverified users
              await supabase.auth.signOut();
              setUser(null);
              setIsAuthenticated(false);
              setSessionActive(false);
              return;
            }
            
            const userState: User = {
              id: String(userData.id),
              name: String(userData.name),
              email: String(userData.email),
              role: userData.role as "user" | "admin",
              created_at: userData.created_at ? String(userData.created_at) : undefined,
              isVerified: Boolean(userData.is_verified),
            }
            setUser(userState)
            setIsAuthenticated(true)
            setSessionActive(true)
            logAuthState('Auth State Updated', { user: userState })
            
            // Handle redirect after login if returnTo parameter exists
            const currentSearchParams = searchParams
            if (event === 'SIGNED_IN' && currentSearchParams) {
              const returnTo = currentSearchParams.get('returnTo')
              if (returnTo) {
                logAuthState('Redirect After Login', { returnTo })
                router.push(returnTo)
              }
            }
            clearSessionExpiredMessage()
          }
        } catch (error) {
          logAuthState('State Change Error', error)
        }
      }
    })

    return () => {
      logAuthState('Cleanup', 'Unsubscribing from auth changes')
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, searchParams, refreshSession, clearSessionExpiredMessage])

  const login = async (email: string, password: string, isAuthCheck = false) => {
    if (typeof window === 'undefined') {
      return { success: false, message: "Cannot login in server environment" }
    }
    
    setIsLoading(true)
    try {
      const isSpecificUser = email === 'tinnlo@proton.me';
      
      if (isSpecificUser) {
        console.log("Special user login attempt detected:", email);
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        logAuthState('Login Error', { error: error?.message || error })
        return { success: false, message: error.message }
      }

      if (!data?.user) {
        console.error("No user returned from signInWithPassword")
        return { success: false, message: "Login failed. Please try again." }
      }

      // Get the user data from our database
      const userData = await getCurrentUser()

      if (!userData) {
        console.error("User data not found after login")
        
        // Special case for auth check - don't show error
        if (isAuthCheck) {
          return { success: false, message: "Account setup incomplete" }
        }
        
        return { success: false, message: "User data not found. Please contact support." }
      }

      // Check if the user is verified
      if (!userData.is_verified) {
        console.error("Unverified user attempted login:", userData.email)
        
        // Sign out unverified users
        await supabase.auth.signOut()
        
        return { 
          success: false, 
          message: "Your account is pending approval. We'll notify you when your account is ready." 
        }
      }

      const userState: User = {
        id: String(userData.id),
        name: String(userData.name),
        email: String(userData.email),
        role: userData.role as "user" | "admin",
        created_at: userData.created_at ? String(userData.created_at) : undefined,
        isVerified: Boolean(userData.is_verified),
      }

      setUser(userState)
      setIsAuthenticated(true)
      setSessionActive(true)

      // If this is just an auth check, don't redirect
      if (isAuthCheck) {
        return { success: true, message: "Authentication successful" }
      }

      // Determine where to redirect based on user role
      const redirectTo = userState.role === "admin" ? "/admin/users" : "/dashboard"
      const returnTo = searchParams?.get('returnTo') || null
      
      return { 
        success: true, 
        message: "Login successful", 
        redirectTo: returnTo || redirectTo 
      }
    } catch (error: any) {
      logAuthState('Login Error', { error: error?.message || error })
      return { 
        success: false, 
        message: "An unexpected error occurred. Please try again." 
      }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    if (typeof window === 'undefined') {
      return { success: false, message: "Cannot register in server environment" }
    }
    
    setIsLoading(true)
    try {
      // First, check if a user with this email already exists
      const { data: existingUsers, error: existingError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
      
      if (existingError) {
        console.error("Error checking existing user:", existingError)
      } else if (existingUsers && existingUsers.length > 0) {
        return { 
          success: false, 
          message: "An account with this email already exists. Please log in instead." 
        }
      }
      
      // Register the user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })

      if (error) {
        console.error("Registration error:", error)
        return { success: false, message: error.message }
      }

      if (!data?.user) {
        console.error("No user returned from signUp")
        return { success: false, message: "Registration failed. Please try again." }
      }

      // Create a record in our users table
      const { error: insertError } = await supabase.from("users").insert([
        {
          id: data.user.id,
          name,
          email,
          role: "user", // Default role
          is_verified: false, // Requires admin approval
        },
      ])

      if (insertError) {
        console.error("Error inserting user record:", insertError)
        
        // If this is a duplicate key error, the user might already exist
        if (insertError.message.includes("duplicate key")) {
          return { 
            success: true, 
            message: "Your account has been created. Please wait for admin approval before logging in." 
          }
        }
        
        return { success: false, message: insertError.message }
      }

      // Sign out the user since they need admin approval
      await supabase.auth.signOut()

      return { 
        success: true, 
        message: "Your account has been created. Please wait for admin approval before logging in." 
      }
    } catch (error: any) {
      console.error("Unexpected registration error:", error)
      return { 
        success: false, 
        message: "An unexpected error occurred. Please try again." 
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    if (typeof window === 'undefined') return
    
    try {
      setIsLoading(true)
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear our state
      setUser(null)
      setIsAuthenticated(false)
      setSessionActive(false)
      
      // Redirect to login page
      router.push("/login")
    } catch (error) {
      console.error("Error during logout:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated,
        refreshSession,
        sessionExpiredMessage,
        clearSessionExpiredMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Wrapper component that provides the AuthContext
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div>Loading authentication...</div>}>
      <AuthProviderContent>
        {children}
      </AuthProviderContent>
    </Suspense>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

