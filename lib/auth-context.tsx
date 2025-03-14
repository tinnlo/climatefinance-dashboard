"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase, getCurrentUser } from "@/lib/supabase-client"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

export interface User {
  id: string
  name: string
  email: string
  role: "user" | "admin"
  isVerified: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; redirectTo?: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  isAuthenticated: boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create a session storage key to track login state
const SESSION_STORAGE_KEY = 'auth_session_active'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const logAuthState = (action: string, data: any) => {
    console.log(`[Auth Debug - ${action}]`, {
      ...data,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'server-side',
    })
  }

  // Helper to store session state in sessionStorage
  const setSessionActive = (active: boolean) => {
    if (typeof window !== 'undefined') {
      if (active) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
      }
    }
  }

  // Helper to check if session is active in sessionStorage
  const isSessionActive = (): boolean => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true'
    }
    return false
  }

  const refreshSession = async () => {
    try {
      logAuthState('Refresh Session', 'Manually refreshing session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error
      
      if (session?.user) {
        const userData = await getCurrentUser()
        if (userData) {
          const userState = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            isVerified: userData.is_verified,
          }
          setUser(userState)
          setIsAuthenticated(true)
          setSessionActive(true)
          logAuthState('Session Refreshed', { user: userState })
          return
        }
      }
      
      // If we get here, there's no valid session
      setUser(null)
      setIsAuthenticated(false)
      setSessionActive(false)
      logAuthState('Session Refresh Failed', 'No valid session found')
    } catch (error) {
      logAuthState('Session Refresh Error', error)
      setUser(null)
      setIsAuthenticated(false)
      setSessionActive(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        logAuthState('Initialize', 'Starting auth initialization...')
        
        // Check if we have an active session in sessionStorage
        const sessionActive = isSessionActive()
        logAuthState('Session Storage Check', { sessionActive })
        
        const { data: { session }, error } = await supabase.auth.getSession()
        logAuthState('Session Check', { session, error })

        if (error) throw error

        if (session?.user && mounted) {
          const userData = await getCurrentUser()
          if (userData) {
            const userState = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              isVerified: userData.is_verified,
            }
            setUser(userState)
            setIsAuthenticated(true)
            setSessionActive(true)
            logAuthState('User State Updated', { user: userState })
          }
        } else if (sessionActive && mounted) {
          // If sessionStorage says we're active but we don't have a session,
          // try to refresh the session
          logAuthState('Session Mismatch', { sessionActive, hasSession: !!session })
          await refreshSession()
        }
      } catch (error) {
        logAuthState('Initialize Error', error)
        if (mounted) {
          setUser(null)
          setIsAuthenticated(false)
          setSessionActive(false)
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
            const userState = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              isVerified: userData.is_verified,
            }
            setUser(userState)
            setIsAuthenticated(true)
            setSessionActive(true)
            logAuthState('Auth State Updated', { user: userState })
            
            // Handle redirect after login if returnTo parameter exists
            const returnTo = searchParams.get('returnTo')
            if (event === 'SIGNED_IN' && returnTo) {
              logAuthState('Redirect After Login', { returnTo })
              router.push(returnTo)
            }
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
  }, [router, searchParams])

  const login = async (email: string, password: string) => {
    logAuthState('Login Start', { email })
    setIsLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      const userData = await getCurrentUser()
      logAuthState('Login Response', { userData })

      if (!userData) {
        throw new Error("User data not found")
      }

      if (!userData.is_verified) {
        await supabase.auth.signOut()
        setSessionActive(false)
        return {
          success: false,
          message: "Your account is pending approval. Please wait for the institute to verify your account.",
        }
      }

      const userState = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        isVerified: userData.is_verified,
      }
      setUser(userState)
      setIsAuthenticated(true)
      setSessionActive(true)

      // Check if there's a returnTo parameter in the URL
      const returnTo = searchParams.get('returnTo')
      const targetPath = returnTo || (userData.role === "admin" ? "/admin/users" : "/dashboard")
      
      logAuthState('Login Success', { targetPath, userState, returnTo })

      return {
        success: true,
        message: "Login successful",
        redirectTo: targetPath
      }
    } catch (error: any) {
      logAuthState('Login Error', error)
      setSessionActive(false)
      return { success: false, message: error.message }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from("users").insert([
          {
            id: data.user.id,
            name,
            email,
            role: "user",
            is_verified: false,
          },
        ]);

        if (profileError) throw profileError;
      }

      return { success: true, message: "Registration successful. Please wait for admin approval." };
    } catch (error: any) {
      logAuthState('Registration Error', error);
      return { success: false, message: error.message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      setSessionActive(false);
      router.push('/login');
    } catch (error) {
      logAuthState('Logout Error', error);
    }
  };

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

