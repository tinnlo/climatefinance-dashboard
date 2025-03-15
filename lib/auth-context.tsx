"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react"
import { supabase, getCurrentUser } from "@/lib/supabase-client"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

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

  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // This is an auth check, not a user-initiated login
        const result = await login(session.user.email, "", true)
        
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
      console.error("Error refreshing session:", error)
      setIsAuthenticated(false)
      setSessionActive(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

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
            
            const userState = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              created_at: userData.created_at,
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
            
            const userState = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              created_at: userData.created_at,
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

  const login = async (email: string, password: string, isAuthCheck = false) => {
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
        console.error("Login error:", error)
        return { success: false, message: error.message }
      }

      if (!data?.user) {
        console.error("No user returned from signInWithPassword")
        return { success: false, message: "Login failed. Please try again." }
      }

      console.log("User authenticated successfully:", {
        id: data.user.id,
        email: data.user.email
      })

      // Get user data from the users table
      let userData = await getCurrentUser()
      
      // Special handling for the specific user
      if (!userData && isSpecificUser) {
        console.log("Special user authenticated but not found in users table. Attempting to create user record.");
        
        // Get the authenticated user
        const { data: authUser } = await supabase.auth.getUser();
        
        if (authUser?.user) {
          console.log("Auth user found:", {
            id: authUser.user.id,
            email: authUser.user.email
          });
          
          // Try to create the user in the users table
          const { data: newUser, error: createError } = await supabase
            .from("users")
            .insert([
              {
                id: authUser.user.id,
                name: authUser.user.user_metadata?.name || email.split('@')[0] || "User",
                email: authUser.user.email,
                role: "user",
                is_verified: false,
              },
            ])
            .select();
          
          if (createError) {
            console.error("Error creating user record:", createError);
          } else if (newUser && newUser.length > 0) {
            console.log("Successfully created user record:", newUser[0]);
            userData = newUser[0];
          }
        }
      }

      // If we still don't have user data, handle the error gracefully
      if (!userData) {
        console.error("User authenticated but not found in users table:", {
          id: data.user.id,
          email: data.user.email
        });
        
        // Sign out the user since we couldn't find their data
        await supabase.auth.signOut();
        
        if (isSpecificUser) {
          return { 
            success: false, 
            message: "Your account has been created and is pending approval. Please try again later or contact support." 
          };
        }
        
        return { 
          success: false, 
          message: "Account setup incomplete. Please check your email or contact support." 
        };
      }

      // Check if the user is verified
      if (userData.is_verified === false) {
        console.log("User is not verified:", {
          id: userData.id,
          email: userData.email,
          is_verified: userData.is_verified
        });
        
        // Sign out the user since they're not verified
        await supabase.auth.signOut();
        
        return {
          success: false,
          message: "Your account is pending approval. Please try again later.",
        }
      }

      setUser(userData)
      // Add a flag to indicate if this is a user-initiated login or an auth check
      return { 
        success: true, 
        message: "Login successful",
        isAuthCheck: isAuthCheck
      }
    } catch (error) {
      console.error("Unexpected error during login:", error)
      return {
        success: false,
        message: "An unexpected error occurred. Please try again.",
      }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      logAuthState('Registration Start', { name, email });
      
      // Store the name in the user metadata during signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name, // Store the name in the user metadata
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        logAuthState('Auth Signup Success', { userId: data.user.id });
        
        // Insert the user profile with detailed error logging
        const { error: profileError } = await supabase.from("users").insert([
          {
            id: data.user.id,
            name,
            email,
            role: "user",
            is_verified: false,
          },
        ]);

        if (profileError) {
          logAuthState('Profile Creation Error', { 
            error: profileError,
            errorMessage: profileError.message,
            errorDetails: profileError.details,
            errorHint: profileError.hint,
            userId: data.user.id 
          });
          
          // Check if the error is about RLS violations
          if (profileError.message.includes("violates row-level security policy")) {
            // Verify if the user was actually created despite the error
            const { data: verifyData, error: verifyError } = await supabase
              .from("users")
              .select("id")
              .eq("id", data.user.id)
              .single();
            
            if (!verifyError && verifyData) {
              // User exists despite the RLS error, so registration was actually successful
              logAuthState('User Exists Despite RLS Error', { userId: data.user.id });
              return { success: true, message: "Registration successful. Please wait for admin approval." };
            }
          }
          
          // We can't delete the auth user from the client side
          // Just log the error and throw
          throw new Error(`Failed to create user profile: ${profileError.message}`);
        }
        
        logAuthState('Registration Complete', { userId: data.user.id });
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

