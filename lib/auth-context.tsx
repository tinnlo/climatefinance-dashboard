"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback, Suspense } from "react"
import { getSupabaseClient, getCurrentUser } from "@/lib/supabase-client"
import { useRouter, usePathname } from "next/navigation"
import { useSearchParamsContext } from "@/app/components/SearchParamsProvider"

// Import environmental variables for Supabase URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export interface User {
  id: string
  name: string
  email: string
  role: "user" | "admin"
  created_at?: string
  isVerified: boolean
}

// Define an enum for the auth state machine
export enum AuthState {
  INITIAL = "INITIAL",
  CHECKING = "CHECKING",
  AUTHENTICATED = "AUTHENTICATED",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  ERROR = "ERROR",
  LOGGING_OUT = "LOGGING_OUT",
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; redirectTo?: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  isAuthenticated: boolean
  refreshSession: () => Promise<void>
  sessionExpiredMessage: string | null
  clearSessionExpiredMessage: () => void
  authState: AuthState
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create a session storage key to track login state
const SESSION_STORAGE_KEY = 'auth_session_active'
const SESSION_TIMESTAMP_KEY = 'auth_session_timestamp'
const SESSION_EXPIRY_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Add this hook near the top of the file after imports
function useIsBrowser() {
  const [isBrowser, setIsBrowser] = useState(false);
  
  useEffect(() => {
    setIsBrowser(true);
  }, []);
  
  return isBrowser;
}

// Inner component that uses search params
function AuthProviderContent({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null)
  const [authState, setAuthState] = useState<AuthState>(AuthState.INITIAL)
  const isBrowser = useIsBrowser();
  
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParamsContext()
  const supabase = getSupabaseClient()

  // Helper to store session state in localStorage with expiration timestamp
  const setSessionActive = (active: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        if (active) {
          localStorage.setItem(SESSION_STORAGE_KEY, 'true')
          localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString())
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY)
          localStorage.removeItem(SESSION_TIMESTAMP_KEY)
        }
      } catch (e) {
        console.error("Error accessing localStorage:", e)
      }
    }
  }

  // Helper to check if session is active and not expired in localStorage
  const isSessionActive = async (): Promise<boolean> => {
    if (typeof window !== 'undefined') {
      try {
        // First check localStorage
        const isActive = localStorage.getItem(SESSION_STORAGE_KEY) === 'true'
        if (!isActive) return false
        
        const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)
        if (!timestamp) return false
        
        const sessionTime = parseInt(timestamp, 10)
        const currentTime = Date.now()
        
        // Check if session is expired
        if (currentTime - sessionTime > SESSION_EXPIRY_DURATION) {
          localStorage.removeItem(SESSION_STORAGE_KEY)
          localStorage.removeItem(SESSION_TIMESTAMP_KEY)
          return false
        }
        
        // Verify with Supabase
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) {
          localStorage.removeItem(SESSION_STORAGE_KEY)
          localStorage.removeItem(SESSION_TIMESTAMP_KEY)
          return false
        }
        
        return true
      } catch (e) {
        console.error("Error reading from localStorage:", e)
        return false
      }
    }
    return false
  }

  const clearSessionExpiredMessage = useCallback(() => {
    setSessionExpiredMessage(null)
  }, [])

  const refreshSession = useCallback(async () => {
    if (!isBrowser) return
    
    try {
      setIsLoading(true)
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw sessionError
      }
      
      if (session) {
        clearSessionExpiredMessage()
        const userData = await getCurrentUser()
        
        if (userData) {
          const userState: User = {
            id: String(userData.id),
            name: String(userData.name),
            email: String(userData.email),
            role: userData.role as "user" | "admin",
            created_at: userData.created_at ? String(userData.created_at) : undefined,
            isVerified: true
          }
          setUser(userState)
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
      console.error("Error refreshing session:", error)
      setIsAuthenticated(false)
      setSessionActive(false)
    } finally {
      setIsLoading(false)
    }
  }, [isBrowser, clearSessionExpiredMessage])

  // Initialize auth state
  useEffect(() => {
    if (!isBrowser) return

    const initializeAuth = async () => {
      try {
        setIsLoading(true)
        setAuthState(AuthState.CHECKING)
        
        // Check if we have a valid session in localStorage first
        const hasActiveSession = await isSessionActive()
        
        if (hasActiveSession) {
          // If we have a valid session, get the current session
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error) {
            setAuthState(AuthState.ERROR)
            throw error
          }

          if (session?.user) {
            const userData = await getCurrentUser()
            if (userData) {
              const userState: User = {
                id: String(userData.id),
                name: String(userData.name),
                email: String(userData.email),
                role: userData.role as "user" | "admin",
                created_at: userData.created_at ? String(userData.created_at) : undefined,
                isVerified: true
              }
              setUser(userState)
              setIsAuthenticated(true)
              setSessionActive(true)
              setAuthState(AuthState.AUTHENTICATED)
              return
            }
          }
        }
        
        // If we get here, either no session or invalid session
        setIsAuthenticated(false)
        setSessionActive(false)
        setAuthState(AuthState.UNAUTHENTICATED)
      } catch (error) {
        console.error("Error initializing auth:", error)
        setIsAuthenticated(false)
        setSessionActive(false)
        setAuthState(AuthState.ERROR)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsAuthenticated(false)
        setSessionActive(false)
        return
      }

      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        if (session?.user) {
          const userData = await getCurrentUser()
          if (userData) {
            const userState: User = {
              id: String(userData.id),
              name: String(userData.name),
              email: String(userData.email),
              role: userData.role as "user" | "admin",
              created_at: userData.created_at ? String(userData.created_at) : undefined,
              isVerified: true
            }
            setUser(userState)
            setIsAuthenticated(true)
            setSessionActive(true)
            
            if (event === 'SIGNED_IN' && searchParams) {
              const returnTo = searchParams.get('returnTo')
              if (returnTo) {
                router.push(returnTo)
              }
            }
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [isBrowser, router, searchParams])

  const login = async (email: string, password: string) => {
    if (typeof window === 'undefined') {
      return { success: false, message: "Cannot login in server environment" }
    }
    
    try {
      setIsLoading(true)
      setAuthState(AuthState.CHECKING)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setAuthState(AuthState.UNAUTHENTICATED)
        return { success: false, message: error.message }
      }

      if (!data?.user) {
        setAuthState(AuthState.UNAUTHENTICATED)
        return { success: false, message: "Login failed. Please try again." }
      }

      const userData = await getCurrentUser()
      if (!userData) {
        setAuthState(AuthState.UNAUTHENTICATED)
        return { success: false, message: "Failed to fetch user data" }
      }

      const userState: User = {
        id: String(userData.id),
        name: String(userData.name),
        email: String(userData.email),
        role: userData.role as "user" | "admin",
        created_at: userData.created_at ? String(userData.created_at) : undefined,
        isVerified: true
      }

      setUser(userState)
      setIsAuthenticated(true)
      setSessionActive(true)
      setAuthState(AuthState.AUTHENTICATED)

      // Determine redirect path based on user role
      const redirectTo = userState.role === "admin" ? "/admin/users" : "/dashboard";

      // Return success with redirect path
      return { 
        success: true, 
        message: "Login successful", 
        redirectTo 
      }
    } catch (error) {
      console.error("Login error:", error)
      setAuthState(AuthState.ERROR)
      return { success: false, message: "An unexpected error occurred" }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    if (typeof window === 'undefined') {
      return { success: false, message: "Cannot register in server environment" }
    }
    
    try {
      setIsLoading(true)
      
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
        return { success: false, message: error.message }
      }

      if (!data?.user) {
        return { success: false, message: "Registration failed. Please try again." }
      }

      const { error: insertError } = await supabase.from("users").insert([
        {
          id: data.user.id,
          name,
          email,
          role: "user",
          is_verified: false,
        },
      ])

      if (insertError) {
        if (insertError.message.includes("duplicate key")) {
          return { 
            success: true, 
            message: "Your account has been created. Please wait for admin approval before logging in." 
          }
        }
        return { success: false, message: insertError.message }
      }

      await supabase.auth.signOut()
      return { 
        success: true, 
        message: "Your account has been created. Please wait for admin approval before logging in." 
      }
    } catch (error) {
      console.error("Registration error:", error)
      return { success: false, message: "An unexpected error occurred" }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      setAuthState(AuthState.LOGGING_OUT)
      await supabase.auth.signOut()
      setUser(null)
      setIsAuthenticated(false)
      setSessionActive(false)
      setAuthState(AuthState.UNAUTHENTICATED)
      router.push('/login')
    } catch (error) {
      console.error("Logout error:", error)
      setAuthState(AuthState.ERROR)
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
        authState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Wrapper component for safety
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <AuthProviderContent>{children}</AuthProviderContent>
    </Suspense>
  )
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}


