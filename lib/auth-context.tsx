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
  login: (email: string, password: string, isAuthCheck?: boolean) => Promise<{ success: boolean; message: string; redirectTo?: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  isAuthenticated: boolean
  refreshSession: () => Promise<void>
  sessionExpiredMessage: string | null
  clearSessionExpiredMessage: () => void
  forceSignOut: () => Promise<void>
  authState: AuthState
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create a session storage key to track login state
const SESSION_STORAGE_KEY = 'auth_session_active'
const AUTH_LAST_ERROR_KEY = 'auth_last_error'
const AUTH_OPERATION_TIMEOUT = 15000 // 15 seconds timeout for auth operations

// Inner component that uses search params
function AuthProviderContent({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null)
  const [authState, setAuthState] = useState<AuthState>(AuthState.INITIAL)
  const [lastAuthActivity, setLastAuthActivity] = useState<number>(Date.now())
  
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParamsContext()
  const supabase = getSupabaseClient()

  const logAuthState = (action: string, data: any) => {
    console.log(`[Auth Debug - ${action}]`, {
      ...data,
      authState,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'server-side',
    })
  }

  // Track last error for debugging
  const setLastAuthError = (error: any) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AUTH_LAST_ERROR_KEY, JSON.stringify({
          timestamp: new Date().toISOString(),
          message: error?.message || String(error),
          stack: error?.stack,
        }))
      } catch (e) {
        console.error("Failed to store auth error:", e)
      }
    }
  }

  // Helper to store session state in localStorage (changed from sessionStorage for persistence)
  const setSessionActive = (active: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        if (active) {
          localStorage.setItem(SESSION_STORAGE_KEY, 'true')
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY)
        }
      } catch (e) {
        console.error("Error accessing localStorage:", e)
      }
    }
  }

  // Helper to check if session is active in localStorage
  const isSessionActive = (): boolean => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(SESSION_STORAGE_KEY) === 'true'
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

  // Force a sign out that clears all storage
  const forceSignOut = useCallback(async () => {
    logAuthState('Force Sign Out', 'Forcing sign out and clearing all auth state')
    
    try {
      setAuthState(AuthState.LOGGING_OUT)
      
      // First try the supabase signout
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.error("Error during supabase sign out:", err)
      }
      
      // Then clear local state
      setUser(null)
      setIsAuthenticated(false)
      setSessionActive(false)
      setAuthState(AuthState.UNAUTHENTICATED)
      
      // Clear localStorage/sessionStorage
      if (typeof window !== 'undefined') {
        try {
          // Clear auth-related items
          localStorage.removeItem(SESSION_STORAGE_KEY)
          localStorage.removeItem('supabase.auth.token')
          sessionStorage.removeItem('supabase.auth.token')
          
          // Attempt to clear cookies
          document.cookie.split(';').forEach(c => {
            document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
          })
        } catch (e) {
          console.error("Error clearing storage:", e)
        }
      }
    } catch (error) {
      setLastAuthError(error)
      logAuthState('Force Sign Out Error', error)
      setAuthState(AuthState.ERROR)
    }
  }, [supabase.auth])

  const refreshSession = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (authState === AuthState.CHECKING) {
      logAuthState('Refresh Session Skipped', 'Already checking authentication')
      return
    }
    
    const startTime = Date.now()
    setLastAuthActivity(startTime)
    
    try {
      setAuthState(AuthState.CHECKING)
      setIsLoading(true)
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw sessionError
      }
      
      if (session) {
        clearSessionExpiredMessage()
        // This is an auth check, not a user-initiated login
        const result = await login(session.user.email ?? "", "", true)
        
        if (result.success) {
          setIsAuthenticated(true)
          setSessionActive(true)
          setAuthState(AuthState.AUTHENTICATED)
        } else {
          logAuthState('Session Invalid', { message: result.message })
          setIsAuthenticated(false)
          setSessionActive(false)
          setAuthState(AuthState.UNAUTHENTICATED)
        }
      } else {
        logAuthState('No Session', 'No active session found')
        setIsAuthenticated(false)
        setSessionActive(false)
        setAuthState(AuthState.UNAUTHENTICATED)
      }
    } catch (error) {
      setLastAuthError(error)
      logAuthState('Refresh Session Error', { error, elapsed: Date.now() - startTime })
      setIsAuthenticated(false)
      setSessionActive(false)
      setAuthState(AuthState.ERROR)
    } finally {
      setIsLoading(false)
    }
  }, [clearSessionExpiredMessage, authState])

  // Timeout handler for auth operations that take too long
  useEffect(() => {
    // Only monitor when we're in a transitional state
    if (authState !== AuthState.CHECKING && authState !== AuthState.LOGGING_OUT) {
      return
    }
    
    const timeoutId = setTimeout(() => {
      const elapsedTime = Date.now() - lastAuthActivity
      
      if (elapsedTime > AUTH_OPERATION_TIMEOUT) {
        logAuthState('Auth Operation Timeout', { 
          currentState: authState,
          elapsedTime,
        })
        
        // Force reset to a clean state
        setIsLoading(false)
        setIsAuthenticated(false)
        setSessionActive(false)
        setAuthState(AuthState.ERROR)
      }
    }, AUTH_OPERATION_TIMEOUT + 1000) // Add extra second to ensure timeout happens after operation timeout
    
    return () => clearTimeout(timeoutId)
  }, [authState, lastAuthActivity])

  // Main auth initialization effect
  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true
    const startTime = Date.now()
    setLastAuthActivity(startTime)

    const initializeAuth = async () => {
      // Skip if already in a checking state to prevent multiple simultaneous checks
      if (authState === AuthState.CHECKING) return
      
      try {
        setAuthState(AuthState.CHECKING)
        logAuthState('Initialize', 'Starting auth initialization...')
        
        // Check if we have an active session in localStorage
        const sessionActive = isSessionActive()
        logAuthState('Session Storage Check', { sessionActive })
        
        // Get session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession()
        logAuthState('Session Check', { 
          hasSession: !!session, 
          sessionActive, 
          timestamp: new Date().toISOString() 
        })

        if (error) throw error

        // Case 1: We have a session with a user
        if (session?.user && mounted) {
          const userData = await getCurrentUser()
          if (userData) {
            // Check if the user is verified
            if (!userData.is_verified) {
              logAuthState('Unverified User Session Found', { 
                email: userData.email, 
                id: userData.id 
              })
              
              // Sign out unverified users
              await supabase.auth.signOut()
              setUser(null)
              setIsAuthenticated(false)
              setSessionActive(false)
              setAuthState(AuthState.UNAUTHENTICATED)
              return
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
            setAuthState(AuthState.AUTHENTICATED)
            logAuthState('User State Updated', { user: userState })
            clearSessionExpiredMessage()
            return
          } else {
            logAuthState('Session With No User Data', { 
              session: session.user.email,
              userFetchFailed: true,
            })
          }
        } 
        
        // Case 2: Session mismatch (localStorage thinks we're active but Supabase doesn't have a session)
        if (sessionActive && !session && mounted) {
          logAuthState('Session Mismatch - Likely Expired', { sessionActive, hasSession: !!session })
          setSessionExpiredMessage("Your session has expired. Please log in again.")
          setAuthState(AuthState.UNAUTHENTICATED)
          
          // Force a clean state
          setUser(null)
          setIsAuthenticated(false)
          setSessionActive(false)
          return
        } 
        
        // Case 3: No session anywhere
        if (mounted) {
          logAuthState('No Active Session', { sessionActive, hasSession: !!session })
          clearSessionExpiredMessage()
          setUser(null)
          setIsAuthenticated(false)
          setSessionActive(false)
          setAuthState(AuthState.UNAUTHENTICATED)
        }
      } catch (error) {
        setLastAuthError(error)
        logAuthState('Initialize Error', { error, elapsed: Date.now() - startTime })
        if (mounted) {
          setUser(null)
          setIsAuthenticated(false)
          setSessionActive(false)
          setAuthState(AuthState.ERROR)
          clearSessionExpiredMessage()
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // Set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logAuthState('Auth State Change', { event, session })

      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsAuthenticated(false)
        setSessionActive(false)
        setAuthState(AuthState.UNAUTHENTICATED)
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
              })
              
              // Sign out unverified users
              await supabase.auth.signOut()
              setUser(null)
              setIsAuthenticated(false)
              setSessionActive(false)
              setAuthState(AuthState.UNAUTHENTICATED)
              return
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
            setAuthState(AuthState.AUTHENTICATED)
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
          } else {
            logAuthState('Auth State Change - No User Data', {
              sessionEmail: session.user.email,
              event
            })
            
            // If signed in but no user data, we need to repair the state
            if (event === 'SIGNED_IN') {
              // Force sign out if we can't get user data
              await forceSignOut()
            }
          }
        } catch (error) {
          setLastAuthError(error)
          logAuthState('State Change Error', error)
          
          // Force a sign out on error to prevent stuck states
          if (event === 'SIGNED_IN') {
            await forceSignOut()
          }
        }
      }
    })

    return () => {
      logAuthState('Cleanup', 'Unsubscribing from auth changes')
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, searchParams, refreshSession, clearSessionExpiredMessage, forceSignOut, authState, supabase.auth])

  const login = async (email: string, password: string, isAuthCheck = false) => {
    if (typeof window === 'undefined') {
      return { success: false, message: "Cannot login in server environment" }
    }
    
    const startTime = Date.now()
    setLastAuthActivity(startTime)
    setIsLoading(true)
    
    // If this is a user-initiated login, update the state to checking
    if (!isAuthCheck) {
      setAuthState(AuthState.CHECKING)
    }
    
    try {
      // Special user logging for debugging purposes
      const isSpecificUser = email === 'tinnlo@proton.me'
      if (isSpecificUser) {
        console.log("Special user login attempt detected:", email)
      }
      
      // For auth checks, verify session without password
      if (isAuthCheck) {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          logAuthState('Auth Check - No Session', { elapsed: Date.now() - startTime })
          return { success: false, message: "No active session" }
        }
        
        // If we have a session but no email, try to use the session user's email
        if (!email && session.user.email) {
          email = session.user.email
          logAuthState('Auth Check - Using Session Email', { email })
        }
      } else {
        // Regular login with password
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setLastAuthError(error)
          logAuthState('Login Error', { error: error?.message || error, elapsed: Date.now() - startTime })
          setAuthState(AuthState.ERROR)
          return { success: false, message: error.message }
        }

        if (!data?.user) {
          console.error("No user returned from signInWithPassword")
          setAuthState(AuthState.ERROR)
          return { success: false, message: "Login failed. Please try again." }
        }
      }

      // Get the user data from our database
      const userData = await getCurrentUser()

      if (!userData) {
        console.error("User data not found after login")
        
        // Special case for auth check - don't show error
        if (isAuthCheck) {
          setAuthState(AuthState.UNAUTHENTICATED)
          return { success: false, message: "Account setup incomplete" }
        }
        
        setAuthState(AuthState.ERROR)
        return { success: false, message: "User data not found. Please contact support." }
      }

      // Check if the user is verified
      if (!userData.is_verified) {
        console.error("Unverified user attempted login:", userData.email)
        
        // Sign out unverified users
        await supabase.auth.signOut()
        setAuthState(AuthState.UNAUTHENTICATED)
        
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
      setAuthState(AuthState.AUTHENTICATED)
      logAuthState('Login Success', { user: userState.email, elapsed: Date.now() - startTime })

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
      setLastAuthError(error)
      logAuthState('Login Error', { error: error?.message || error, elapsed: Date.now() - startTime })
      setAuthState(AuthState.ERROR)
      return { 
        success: false, 
        message: "An unexpected error occurred. Please try again." 
      }
    } finally {
      // Don't change loading state if this was just an auth check
      if (!isAuthCheck) {
        setIsLoading(false)
      }
    }
  }

  const register = async (name: string, email: string, password: string) => {
    if (typeof window === 'undefined') {
      return { success: false, message: "Cannot register in server environment" }
    }
    
    const startTime = Date.now()
    setLastAuthActivity(startTime)
    setIsLoading(true)
    setAuthState(AuthState.CHECKING)
    
    try {
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
        setLastAuthError(error)
        logAuthState('Registration Error', { error: error?.message || error })
        setAuthState(AuthState.ERROR)
        return { success: false, message: error.message }
      }

      if (!data?.user) {
        console.error("No user returned from signUp")
        setAuthState(AuthState.ERROR)
        return { success: false, message: "Registration failed. Please try again." }
      }

      // Insert the user into our users table
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
        console.error("Error inserting user record:", insertError)
        
        // If this is a duplicate key error, the user might already exist
        if (insertError.message.includes("duplicate key")) {
          setAuthState(AuthState.UNAUTHENTICATED)
          return { 
            success: true, 
            message: "Your account has been created. Please wait for admin approval before logging in." 
          }
        }
        
        setAuthState(AuthState.ERROR)
        return { success: false, message: insertError.message }
      }

      // Sign out the user since they need admin approval
      await forceSignOut()

      setAuthState(AuthState.UNAUTHENTICATED)
      return { 
        success: true, 
        message: "Your account has been created. Please wait for admin approval before logging in." 
      }
    } catch (error: any) {
      setLastAuthError(error)
      console.error("Unexpected registration error:", error)
      setAuthState(AuthState.ERROR)
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
    
    const startTime = Date.now()
    setLastAuthActivity(startTime)
    
    try {
      setIsLoading(true)
      setAuthState(AuthState.LOGGING_OUT)
      logAuthState('Logout', 'Starting logout process')
      
      // First clear local state to prevent UI from showing sensitive data
      setUser(null)
      setIsAuthenticated(false)
      setSessionActive(false)
      
      try {
        // Try to sign out from Supabase - we wrap this in a try/catch so the logout process
        // continues even if this part fails
        await supabase.auth.signOut()
        logAuthState('Logout - Supabase SignOut Success', { elapsed: Date.now() - startTime })
      } catch (signOutError) {
        setLastAuthError(signOutError)
        logAuthState('Logout - Supabase SignOut Error', { error: signOutError, elapsed: Date.now() - startTime })
        
        // Even if signOut failed, try to clean up local state
        try {
          // Clear localStorage/sessionStorage as a backup plan
          localStorage.removeItem(SESSION_STORAGE_KEY)
          localStorage.removeItem('supabase.auth.token')
          sessionStorage.removeItem('supabase.auth.token')
        } catch (e) {
          console.error("Error clearing storage during logout:", e)
        }
      }
      
      setAuthState(AuthState.UNAUTHENTICATED)
      logAuthState('Logout Complete', { elapsed: Date.now() - startTime })
      
      // Redirect to login page
      router.push("/login")
    } catch (error) {
      setLastAuthError(error)
      logAuthState('Logout Error', { error, elapsed: Date.now() - startTime })
      
      // Force a sign out as last resort
      await forceSignOut()
      
      // Redirect to login page even if there was an error
      router.push("/login")
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
        forceSignOut,
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

