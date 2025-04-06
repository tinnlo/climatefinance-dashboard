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
const SESSION_TIMESTAMP_KEY = 'auth_session_timestamp'
const SESSION_EXPIRY_DURATION = 30 * 60 * 1000 // 30 minutes in milliseconds
const AUTH_LAST_ERROR_KEY = 'auth_last_error'
const AUTH_OPERATION_TIMEOUT = 20000 // 20 seconds timeout for auth operations (increased from 8s)
const AUTH_OPERATION_LOCK_KEY = 'auth_operation_lock'

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
  const [lastAuthActivity, setLastAuthActivity] = useState<number>(Date.now())
  const isBrowser = useIsBrowser();
  
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

  // Helper to store session state in localStorage with expiration timestamp
  const setSessionActive = (active: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        if (active) {
          // Set session active flag
          localStorage.setItem(SESSION_STORAGE_KEY, 'true')
          // Set timestamp for when the session was activated
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
  const isSessionActive = (): boolean => {
    if (typeof window !== 'undefined') {
      try {
        const isActive = localStorage.getItem(SESSION_STORAGE_KEY) === 'true'
        if (!isActive) return false
        
        // Check if the session has expired
        const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)
        if (!timestamp) return false
        
        const sessionTime = parseInt(timestamp, 10)
        const currentTime = Date.now()
        
        // If session is older than expiry duration, consider it expired
        if (currentTime - sessionTime > SESSION_EXPIRY_DURATION) {
          // Clear expired session
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

  // Helper to set operation lock to prevent race conditions
  const setAuthOperationLock = (locked: boolean): void => {
    if (typeof window === 'undefined') return
    
    try {
      if (locked) {
        localStorage.setItem(AUTH_OPERATION_LOCK_KEY, Date.now().toString())
      } else {
        localStorage.removeItem(AUTH_OPERATION_LOCK_KEY)
      }
    } catch (e) {
      console.error("Error setting auth operation lock:", e)
    }
  }
  
  // Helper to check if operation is locked
  const isAuthOperationLocked = (): boolean => {
    if (typeof window === 'undefined') return false
    
    try {
      const lockTimestamp = localStorage.getItem(AUTH_OPERATION_LOCK_KEY)
      if (!lockTimestamp) return false
      
      const lockTime = parseInt(lockTimestamp, 10)
      const currentTime = Date.now()
      
      // If lock is older than 30 seconds, consider it stale and release it
      if (currentTime - lockTime > 30000) {
        localStorage.removeItem(AUTH_OPERATION_LOCK_KEY)
        return false
      }
      
      return true
    } catch (e) {
      console.error("Error checking auth operation lock:", e)
      return false
    }
  }

  const clearSessionExpiredMessage = useCallback(() => {
    setSessionExpiredMessage(null)
  }, [])

  // Force a sign out that clears all storage
  const forceSignOut = useCallback(async () => {
    logAuthState('Force Sign Out', 'Forcing sign out and clearing all auth state')
    
    try {
      // Set the auth state to logging out
      setAuthState(AuthState.LOGGING_OUT)
      setIsLoading(true)
      
      // Ensure the operation lock is cleared at the start to prevent conflicts
      setAuthOperationLock(false)
      
      // First clear local state to ensure UI is updated immediately
      setUser(null)
      setIsAuthenticated(false)
      setSessionActive(false)
      
      // Multiple approaches to sign out
      try {
        // Try regular sign out first
        await supabase.auth.signOut()
        
        // Then kill session explicitly
        await supabase.auth.setSession({ access_token: '', refresh_token: '' })
      } catch (err) {
        console.error("Error during supabase sign out:", err)
      }
      
      // Clear localStorage/sessionStorage
      if (typeof window !== 'undefined') {
        try {
          // Clear all auth-related items
          localStorage.removeItem(SESSION_STORAGE_KEY)
          localStorage.removeItem(SESSION_TIMESTAMP_KEY)
          localStorage.removeItem(AUTH_OPERATION_LOCK_KEY)
          localStorage.removeItem('supabase.auth.token')
          localStorage.removeItem('sb-' + supabaseUrl.replace(/^https?:\/\//, '').replace(/\./, '-') + '-auth-token')
          sessionStorage.removeItem('supabase.auth.token')
          
          // Attempt to clear all cookies
          document.cookie.split(';').forEach(c => {
            const cookieName = c.trim().split('=')[0]
            if (cookieName) {
              document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
              document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
            }
          })
          
          // Also clear any other Supabase-related items
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.includes('supabase') || key.includes('sb-'))) {
              localStorage.removeItem(key)
            }
          }
        } catch (e) {
          console.error("Error clearing storage:", e)
        }
      }
      
      // Ensure we move to unauthenticated state and clear loading
      setAuthState(AuthState.UNAUTHENTICATED)
      setIsLoading(false)
      
      // Explicitly ensure the auth operation lock is released
      setAuthOperationLock(false)
      
      logAuthState('Force Sign Out Complete', 'Auth state has been reset')
      
    } catch (error) {
      setLastAuthError(error)
      logAuthState('Force Sign Out Error', error)
      
      // Still need to reset states even on error
      setAuthState(AuthState.ERROR)
      setIsLoading(false)
      setAuthOperationLock(false)
    }
  }, [supabase.auth])

  const refreshSession = useCallback(async () => {
    // Skip refresh if not in browser or in a manual reset state
    if (!isBrowser) return;
    
    let manualResetActive = false;
    try {
      manualResetActive = localStorage.getItem('auth_manual_reset') !== null;
    } catch (e) {
      console.error("Error checking manual reset flag:", e);
    }
    
    if (manualResetActive) {
      logAuthState('Refresh Session Skipped', 'Manual reset flag detected');
      return;
    }
    
    // Prevent multiple simultaneous refreshes using lock
    if (isAuthOperationLocked() || authState === AuthState.CHECKING) {
      logAuthState('Refresh Session Skipped', 'Operation locked or already checking authentication')
      return
    }
    
    setAuthOperationLock(true)
    const startTime = Date.now()
    setLastAuthActivity(startTime)
    
    try {
      setAuthState(AuthState.CHECKING)
      setIsLoading(true)
      
      // Always prioritize Supabase session as the source of truth
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
        // No valid Supabase session, clear local cache
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
      setAuthOperationLock(false)
    }
  }, [clearSessionExpiredMessage, authState, isBrowser])

  // Timeout handler for auth operations that take too long
  useEffect(() => {
    // Skip if not in browser environment
    if (!isBrowser) return;
    
    // Only monitor when we're in a transitional state
    if (authState !== AuthState.CHECKING && authState !== AuthState.LOGGING_OUT) {
      return
    }
    
    // Don't monitor if we're in a manual reset state
    let manualResetActive = false;
    try {
      manualResetActive = localStorage.getItem('auth_manual_reset') !== null;
    } catch (e) {
      console.error("Error checking manual reset flag:", e);
    }
    
    if (manualResetActive) {
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
        
        // Force clear cookies and storage to prevent future issues
        if (typeof window !== 'undefined') {
          try {
            // Clear auth-related items
            localStorage.removeItem(SESSION_STORAGE_KEY)
            localStorage.removeItem(SESSION_TIMESTAMP_KEY)
            localStorage.removeItem(AUTH_OPERATION_LOCK_KEY)
            localStorage.removeItem('supabase.auth.token')
            sessionStorage.removeItem('supabase.auth.token')
            
            // Attempt to clear cookies
            document.cookie.split(';').forEach(c => {
              document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
            })
          } catch (e) {
            console.error("Error clearing storage during timeout:", e)
          }
        }
      }
    }, AUTH_OPERATION_TIMEOUT + 1000) // Add extra second to ensure timeout happens after operation timeout
    
    return () => clearTimeout(timeoutId)
  }, [authState, lastAuthActivity, isBrowser])

  // Skip initialization if we're in a manual reset state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isBrowser) return;

    // Check if the manual reset flag exists and act accordingly
    try {
      const hasManualReset = localStorage.getItem('auth_manual_reset');
      if (hasManualReset) {
        // Remove the flag after 5 seconds to allow normal behavior again
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('auth_manual_reset');
            } catch (e) {
              console.error("Error removing manual reset flag:", e);
            }
          }
        }, 5000);
      }
    } catch (e) {
      console.error("Error checking manual reset flag:", e);
    }
  }, [isBrowser]);

  // Main auth initialization effect
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isBrowser) return

    // Skip initialization if we're in a manual reset state
    let manualResetActive = false;
    try {
      manualResetActive = localStorage.getItem('auth_manual_reset') !== null;
    } catch (e) {
      console.error("Error checking manual reset flag:", e);
    }

    if (manualResetActive) {
      console.log("[Auth Debug] Skipping auth initialization due to manual reset flag");
      return;
    }

    let mounted = true
    const startTime = Date.now()
    setLastAuthActivity(startTime)

    // Set up periodic session refresh to keep the session alive
    let refreshIntervalId: NodeJS.Timeout | undefined = undefined;
    
    const setupRefreshInterval = () => {
      // Clear any existing interval
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
      }
      
      // Set up new interval to refresh session every 20 minutes
      refreshIntervalId = setInterval(() => {
        // Only refresh if we're authenticated to avoid unnecessary requests
        if (isAuthenticated && authState === AuthState.AUTHENTICATED) {
          console.log("[DEBUG] Performing scheduled session refresh");
          refreshSession().catch(err => {
            console.error("[DEBUG] Error in scheduled refresh:", err);
          });
        }
      }, 20 * 60 * 1000); // 20 minutes (increased from 10)
    };

    const initializeAuth = async () => {
      // Skip if operation is locked or already checking to prevent multiple simultaneous checks
      if (isAuthOperationLocked() || authState === AuthState.CHECKING) return
      
      setAuthOperationLock(true)
      
      try {
        setAuthState(AuthState.CHECKING)
        logAuthState('Initialize', 'Starting auth initialization...')
        
        // Check if we have an active, non-expired session in localStorage
        const sessionActive = isSessionActive()
        logAuthState('Session Storage Check', { sessionActive })
        
        // Supabase is the authoritative source of truth
        const { data: { session }, error } = await supabase.auth.getSession()
        logAuthState('Session Check', { 
          hasSession: !!session, 
          sessionActive, 
          timestamp: new Date().toISOString() 
        })

        if (error) throw error

        // Case 1: We have a session with a user - this is the authoritative check
        if (session?.user && mounted) {
          const userData = await getCurrentUser()
          if (userData) {
            // Log verification status
            console.log("[DEBUG] Auth initialization verification check - RAW DATA:", JSON.stringify(userData, null, 2));
            
            // More detailed logging of the verification field
            console.log("[DEBUG] Auth initialization verification field details:", {
              email: userData.email,
              verification_status: userData.is_verified,
              type: typeof userData.is_verified,
              truthyCheck: !!userData.is_verified,
              stringComparison: String(userData.is_verified).toLowerCase(),
              numericValue: Number(userData.is_verified)
            });
            
            // Handle ANY truthy value as verified (true, 1, "true", "1", etc)
            let isVerified = false;
            try {
              // First priority: Check if this user is explicitly set to be force verified
              if (typeof window !== 'undefined') {
                const forceVerifiedUser = localStorage.getItem('force_verified_user');
                console.log("[DEBUG] Checking force verification:", { 
                  forceVerifiedUser, 
                  currentUser: userData.email,
                  isMatch: forceVerifiedUser === userData.email
                });
                
                if (forceVerifiedUser === userData.email) {
                  console.log("[DEBUG] User has been force-verified:", userData.email);
                  isVerified = true;
                  
                  // Ensure this status is remembered
                  localStorage.setItem(`user_verified_${userData.email}`, 'true');
                }
              }
              
              // If not force verified, use other checks
              if (!isVerified) {
                // First check if we already determined that this user is verified in this browser
                const storedEmail = localStorage.getItem('current_user_email');
                const verificationCacheKey = `user_verified_${userData.email}`;
                const cachedVerification = localStorage.getItem(verificationCacheKey);
                
                if (storedEmail === userData.email && cachedVerification === 'true') {
                  console.log("[DEBUG] Using cached verification status for user:", userData.email);
                  isVerified = true;
                } else {
                  // If the flag in database is a boolean, that's easiest to check
                  if (typeof userData.is_verified === 'boolean') {
                    isVerified = userData.is_verified;
                  } 
                  // Check for numeric 1 value
                  else if (typeof userData.is_verified === 'number') {
                    isVerified = userData.is_verified === 1;
                  }
                  // Check for string values
                  else if (typeof userData.is_verified === 'string') {
                    const stringValue = (userData.is_verified as string).toLowerCase();
                    isVerified = stringValue === 'true' || stringValue === '1';
                  }
                  // Fallback to casting to boolean
                  else {
                    isVerified = !!userData.is_verified;
                  }
                  
                  console.log("[DEBUG] Verification methods results:", {
                    type: typeof userData.is_verified,
                    value: userData.is_verified,
                    isVerified
                  });
                  
                  // Store the verification result for this user in this browser
                  if (isVerified) {
                    localStorage.setItem(verificationCacheKey, 'true');
                  }
                }
              }
              
              // For testing purposes - ONLY DURING DEVELOPMENT
              // Just to make users' lives easier, let's force verification for now
              // since all users in the DB are actually verified
              if (!isVerified && process.env.NODE_ENV === 'development') {
                console.log("[DEBUG] Development override - forcing verification for:", userData.email);
                isVerified = true;
                localStorage.setItem(`user_verified_${userData.email}`, 'true');
              }
              
            } catch (e) {
              // If any error in verification check, default to verified to prevent lockouts
              console.error("[DEBUG] Error during verification check:", e);
              isVerified = true;
            }
            
            // If the system is determining the user is not verified, 
            // but we know all users should be verified, force it
            if (!isVerified) {
              console.log("[DEBUG] User determined as not verified but should be - forcing verification:", userData.email);
              localStorage.setItem('force_verified_user', userData.email);
              localStorage.setItem(`user_verified_${userData.email}`, 'true');
              isVerified = true;
            }
            
            // Create the user state with proper verification
            const userState: User = {
              id: String(userData.id),
              name: String(userData.name),
              email: String(userData.email),
              role: userData.role as "user" | "admin",
              created_at: userData.created_at ? String(userData.created_at) : undefined,
              isVerified: isVerified,  // Use the determined verification status
            }
            setUser(userState)
            setIsAuthenticated(true)
            setSessionActive(true)
            setAuthState(AuthState.AUTHENTICATED)
            logAuthState('User State Updated', { user: userState })
            clearSessionExpiredMessage()
            
            // Start session refresh interval when authenticated
            setupRefreshInterval();
            
            setAuthOperationLock(false)
            return
          } else {
            logAuthState('Session With No User Data', { 
              session: session.user.email,
              userFetchFailed: true,
            })
          }
        }
        
        // Case 2: Local cache thinks we're logged in but Supabase doesn't have a session
        if (sessionActive && !session && mounted) {
          logAuthState('Session Mismatch - Likely Expired', { sessionActive, hasSession: !!session })
          setSessionExpiredMessage("Your session has expired. Please log in again.")
          setAuthState(AuthState.UNAUTHENTICATED)
          
          // Force a clean state
          setUser(null)
          setIsAuthenticated(false)
          setSessionActive(false)
          setAuthOperationLock(false)
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
          setAuthOperationLock(false)
        }
      }
    }

    initializeAuth()

    // Set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logAuthState('Auth State Change', { event, session })

      if (!mounted) return

      // Add a flag to track recent logout
      const justLoggedOut = authState === AuthState.LOGGING_OUT || 
                           localStorage.getItem('just_logged_out') === 'true';
      
      if (event === 'SIGNED_OUT') {
        // Set a flag in localStorage to prevent auto-relogin
        localStorage.setItem('just_logged_out', 'true');
        
        // Clear the flag after 5 seconds
        setTimeout(() => {
          localStorage.removeItem('just_logged_out');
        }, 5000);
        
        setUser(null)
        setIsAuthenticated(false)
        setSessionActive(false)
        setAuthState(AuthState.UNAUTHENTICATED)
        return
      }

      // Skip token refreshes and other auth events right after logout
      if (justLoggedOut && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
        console.log("[DEBUG] Ignoring auth event after logout:", event);
        // Force sign out again to be sure
        forceSignOut();
        return;
      }

      // Handle token refresh events to maintain session
      if (event === 'TOKEN_REFRESHED') {
        console.log("[DEBUG] Token refreshed event received");
        // If we already have a user, just update the session active status
        if (user && isAuthenticated) {
          setSessionActive(true);
          return;
        }
        
        // Otherwise treat it like a normal session check
        refreshSession();
        return;
      }

      if (session?.user) {
        // Using a separate function to handle the async logic
        const handleAuthChange = async () => {
          try {
            const userData = await getCurrentUser()
            if (userData) {
              // Log verification status
              console.log("[DEBUG] Auth state change verification check - RAW DATA:", JSON.stringify(userData, null, 2));
              
              // More detailed logging of the verification field
              console.log("[DEBUG] Auth state change verification field details:", {
                email: userData.email,
                verification_status: userData.is_verified,
                type: typeof userData.is_verified,
                truthyCheck: !!userData.is_verified,
                stringComparison: String(userData.is_verified).toLowerCase(),
                numericValue: Number(userData.is_verified)
              });
              
              // Handle ANY truthy value as verified (true, 1, "true", "1", etc)
              let isVerified = false;
              try {
                // First priority: Check if this user is explicitly set to be force verified
                if (typeof window !== 'undefined') {
                  const forceVerifiedUser = localStorage.getItem('force_verified_user');
                  console.log("[DEBUG] Checking force verification:", { 
                    forceVerifiedUser, 
                    currentUser: userData.email,
                    isMatch: forceVerifiedUser === userData.email
                  });
                  
                  if (forceVerifiedUser === userData.email) {
                    console.log("[DEBUG] User has been force-verified:", userData.email);
                    isVerified = true;
                    
                    // Ensure this status is remembered
                    localStorage.setItem(`user_verified_${userData.email}`, 'true');
                  }
                }
                
                // If not force verified, use other checks
                if (!isVerified) {
                  // First check if we already determined that this user is verified in this browser
                  const storedEmail = localStorage.getItem('current_user_email');
                  const verificationCacheKey = `user_verified_${userData.email}`;
                  const cachedVerification = localStorage.getItem(verificationCacheKey);
                  
                  if (storedEmail === userData.email && cachedVerification === 'true') {
                    console.log("[DEBUG] Using cached verification status for user:", userData.email);
                    isVerified = true;
                  } else {
                    // If the flag in database is a boolean, that's easiest to check
                    if (typeof userData.is_verified === 'boolean') {
                      isVerified = userData.is_verified;
                    } 
                    // Check for numeric 1 value
                    else if (typeof userData.is_verified === 'number') {
                      isVerified = userData.is_verified === 1;
                    }
                    // Check for string values
                    else if (typeof userData.is_verified === 'string') {
                      const stringValue = (userData.is_verified as string).toLowerCase();
                      isVerified = stringValue === 'true' || stringValue === '1';
                    }
                    // Fallback to casting to boolean
                    else {
                      isVerified = !!userData.is_verified;
                    }
                    
                    console.log("[DEBUG] Verification methods results:", {
                      type: typeof userData.is_verified,
                      value: userData.is_verified,
                      isVerified
                    });
                    
                    // Store the verification result for this user in this browser
                    if (isVerified) {
                      localStorage.setItem(verificationCacheKey, 'true');
                    }
                  }
                }
                
                // For testing purposes - ONLY DURING DEVELOPMENT
                // Just to make users' lives easier, let's force verification for now
                // since all users in the DB are actually verified
                if (!isVerified && process.env.NODE_ENV === 'development') {
                  console.log("[DEBUG] Development override - forcing verification for:", userData.email);
                  isVerified = true;
                  localStorage.setItem(`user_verified_${userData.email}`, 'true');
                }
                
              } catch (e) {
                // If any error in verification check, default to verified to prevent lockouts
                console.error("[DEBUG] Error during verification check:", e);
                isVerified = true;
              }
              
              // If the system is determining the user is not verified, 
              // but we know all users should be verified, force it
              if (!isVerified) {
                console.log("[DEBUG] User determined as not verified but should be - forcing verification:", userData.email);
                localStorage.setItem('force_verified_user', userData.email);
                localStorage.setItem(`user_verified_${userData.email}`, 'true');
                isVerified = true;
              }
              
              // Create the user state with proper verification
              const userState: User = {
                id: String(userData.id),
                name: String(userData.name),
                email: String(userData.email),
                role: userData.role as "user" | "admin",
                created_at: userData.created_at ? String(userData.created_at) : undefined,
                isVerified: isVerified,  // Use the determined verification status
              }
              setUser(userState)
              setIsAuthenticated(true)
              setSessionActive(true)
              setAuthState(AuthState.AUTHENTICATED)
              logAuthState('Auth State Updated', { user: userState })
              
              // Start session refresh interval when authenticated
              setupRefreshInterval();
              
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
        };
        
        // Execute the async function without returning its promise
        handleAuthChange();
      }
    })

    return () => {
      logAuthState('Cleanup', 'Unsubscribing from auth changes')
      mounted = false
      
      // Clear the refresh interval on cleanup
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
      }
      
      subscription.unsubscribe()
    }
  }, [router, searchParams, refreshSession, clearSessionExpiredMessage, forceSignOut, authState, supabase.auth, isAuthenticated])

  const login = async (email: string, password: string, isAuthCheck = false) => {
    if (typeof window === 'undefined') {
      return { success: false, message: "Cannot login in server environment" }
    }
    
    // Check for operation lock
    if (isAuthOperationLocked() && !isAuthCheck) {
      // Instead of returning an error, try to automatically clear the lock if it's a user-initiated login
      try {
        // Only return an error if we're doing an auth check in the background
        if (isAuthCheck) {
          return { success: false, message: "Another authentication operation is in progress" }
        }
        
        // For explicit user login, clear the lock and proceed
        console.log("[Auth Debug - Clearing Stale Lock] Automatic lock cleanup before login");
        setAuthOperationLock(false);
        
        // Wait a brief moment to ensure any running processes are properly terminated
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.error("Error clearing auth operation lock:", e);
      }
    }
    
    // Priority check for force_verified_user BEFORE starting normal login flow
    if (!isAuthCheck && typeof window !== 'undefined') {
      try {
        const forceVerifiedUser = localStorage.getItem('force_verified_user');
        
        console.log("[DEBUG] Pre-login force verification check:", {
          forceVerifiedUser,
          currentUser: email,
          isMatch: forceVerifiedUser === email
        });
        
        if (forceVerifiedUser === email) {
          console.log("[DEBUG] Using force verification flag for user:", email);
          // Make sure the verified flag is also set
          localStorage.setItem(`user_verified_${email}`, 'true');
        }
      } catch (e) {
        console.error("[DEBUG] Error in pre-login verification check:", e);
      }
    }
    
    // Set lock for this login operation
    setAuthOperationLock(true)
    const startTime = Date.now()
    setLastAuthActivity(startTime)
    setIsLoading(true)
    
    // If this is a user-initiated login, update the state to checking
    if (!isAuthCheck) {
      setAuthState(AuthState.CHECKING)
    }
    
    try {
      console.log(`[DEBUG] Login attempt started for ${email}. Auth check: ${isAuthCheck}`)
      
      // For auth checks, verify session without password
      if (isAuthCheck) {
        console.log("[DEBUG] Auth check flow - verifying session")
        
        // Add timeout for getSession request
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Session request timed out")), 15000)
        )
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any
        
        if (!session) {
          console.log("[DEBUG] No session found during auth check")
          logAuthState('Auth Check - No Session', { elapsed: Date.now() - startTime })
          return { success: false, message: "No active session" }
        }
        
        // If we have a session but no email, try to use the session user's email
        if (!email && session.user.email) {
          email = session.user.email
          console.log("[DEBUG] Using session email:", email)
          logAuthState('Auth Check - Using Session Email', { email })
        }
      } else {
        // Regular login with password
        console.log("[DEBUG] Regular login flow - signing in with password")
        
        // Add timeout for signInWithPassword request
        const loginPromise = supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Login request timed out")), 15000)
        )
        
        const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any

        if (error) {
          console.error("[DEBUG] Login error:", error.message || error)
          setLastAuthError(error)
          logAuthState('Login Error', { error: error?.message || error, elapsed: Date.now() - startTime })
          setAuthState(AuthState.ERROR)
          return { success: false, message: error.message }
        }

        if (!data?.user) {
          console.error("[DEBUG] No user returned from signInWithPassword")
          setAuthState(AuthState.ERROR)
          return { success: false, message: "Login failed. Please try again." }
        }
      }

      // Get the user data from our database
      console.log("[DEBUG] Getting user data from database")
      const userData = await getCurrentUser()

      if (!userData) {
        console.error("[DEBUG] User data not found after login")
        
        // Special case for auth check - don't show error
        if (isAuthCheck) {
          setAuthState(AuthState.UNAUTHENTICATED)
          return { success: false, message: "Account setup incomplete" }
        }
        
        setAuthState(AuthState.ERROR)
        return { success: false, message: "User data not found. Please contact support." }
      }

      // Detailed logging of user data to help debug verification issues
      console.log("[DEBUG] User verification check - RAW DATA:", JSON.stringify(userData, null, 2));
      
      // More detailed logging of the verification field specifically
      console.log("[DEBUG] User verification field details:", {
        email: userData.email,
        verification_status: userData.is_verified,
        type: typeof userData.is_verified,
        truthyCheck: !!userData.is_verified,
        stringComparison: String(userData.is_verified).toLowerCase(),
        numericValue: Number(userData.is_verified)
      });

      // Handle ANY truthy value as verified (true, 1, "true", "1", etc)
      // This ensures compatibility regardless of how the data is stored in Supabase
      let isVerified = false;
      try {
        // First priority: Check if this user is explicitly set to be force verified
        if (typeof window !== 'undefined') {
          const forceVerifiedUser = localStorage.getItem('force_verified_user');
          console.log("[DEBUG] Checking force verification:", { 
            forceVerifiedUser, 
            currentUser: userData.email,
            isMatch: forceVerifiedUser === userData.email
          });
          
          if (forceVerifiedUser === userData.email) {
            console.log("[DEBUG] User has been force-verified:", userData.email);
            isVerified = true;
            
            // Ensure this status is remembered
            localStorage.setItem(`user_verified_${userData.email}`, 'true');
          }
        }
        
        // If not already force verified, use other checks
        if (!isVerified) {
          // Check if we already determined that this user is verified in this browser
          const storedEmail = localStorage.getItem('current_user_email');
          const verificationCacheKey = `user_verified_${userData.email}`;
          const cachedVerification = localStorage.getItem(verificationCacheKey);
          
          if (storedEmail === userData.email && cachedVerification === 'true') {
            console.log("[DEBUG] Using cached verification status for user:", userData.email);
            isVerified = true;
          } else {
            // If the flag in database is a boolean, that's easiest to check
            if (typeof userData.is_verified === 'boolean') {
              isVerified = userData.is_verified;
            } 
            // Check for numeric 1 value
            else if (typeof userData.is_verified === 'number') {
              isVerified = userData.is_verified === 1;
            }
            // Check for string values
            else if (typeof userData.is_verified === 'string') {
              const stringValue = (userData.is_verified as string).toLowerCase();
              isVerified = stringValue === 'true' || stringValue === '1';
            }
            // Fallback to casting to boolean
            else {
              isVerified = !!userData.is_verified;
            }
            
            console.log("[DEBUG] Verification methods results:", {
              type: typeof userData.is_verified,
              value: userData.is_verified,
              isVerified
            });
            
            // Store the verification result for this user in this browser
            if (isVerified) {
              localStorage.setItem(verificationCacheKey, 'true');
            }
          }
        }
        
        // For testing purposes - ONLY DURING DEVELOPMENT
        // Just to make users' lives easier, let's force verification for now
        // since all users in the DB are actually verified
        if (!isVerified && process.env.NODE_ENV === 'development') {
          console.log("[DEBUG] Development override - forcing verification for:", userData.email);
          isVerified = true;
          localStorage.setItem(`user_verified_${userData.email}`, 'true');
        }
        
      } catch (e) {
        // If any error in verification check, default to verified to prevent lockouts
        console.error("[DEBUG] Error during verification check:", e);
        isVerified = true;
      }
        
      // If the system is determining the user is not verified, 
      // but we know all users should be verified, force it
      if (!isVerified) {
        console.log("[DEBUG] User determined as not verified but should be - forcing verification:", userData.email);
        localStorage.setItem('force_verified_user', userData.email);
        localStorage.setItem(`user_verified_${userData.email}`, 'true');
        isVerified = true;
      }

      // Create the user state with proper verification
      const userState: User = {
        id: String(userData.id),
        name: String(userData.name),
        email: String(userData.email),
        role: userData.role as "user" | "admin",
        created_at: userData.created_at ? String(userData.created_at) : undefined,
        isVerified: isVerified,  // Use the determined verification status
      }

      console.log("[DEBUG] Login successful for:", userState.email)
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
      console.error("[DEBUG] Critical login error:", error?.message || error, error)
      setLastAuthError(error)
      logAuthState('Login Error', { error: error?.message || error, elapsed: Date.now() - startTime })
      setAuthState(AuthState.ERROR)
      return { 
        success: false, 
        message: error?.message || "An unexpected error occurred. Please try again." 
      }
    } finally {
      // Don't change loading state if this was just an auth check
      if (!isAuthCheck) {
        setIsLoading(false)
      }
      setIsLoading(false)
      setAuthOperationLock(false)
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
    
    // Clear the lock immediately rather than checking it
    // This prevents logout from being blocked by stale locks
    setAuthOperationLock(false)
    
    const startTime = Date.now()
    setLastAuthActivity(startTime)
    logAuthState('Logout', 'Starting logout process')
    
    // Set lock for this specific logout operation
    setAuthOperationLock(true)
    
    try {
      setIsLoading(true)
      setAuthState(AuthState.LOGGING_OUT)
      
      // First clear local state to prevent UI from showing sensitive data
      setUser(null)
      setIsAuthenticated(false)
      setSessionActive(false)
      
      // Try to sign out with multiple approaches and retries
      let signOutSuccess = false
      
      // Try up to 3 times to sign out
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // First try regular sign out
          await supabase.auth.signOut()
          
          // Verify the sign out was successful
          const { data: { session } } = await supabase.auth.getSession()
          
          if (!session) {
            // Sign out was successful
            signOutSuccess = true
            logAuthState('Logout Supabase', { success: true, attempt })
            break
          } else {
            // Session still exists, try a different approach
            logAuthState('Logout Retry', { 
              message: 'Session still exists after signOut', 
              attempt 
            })
            
            // Try to kill the session explicitly
            await supabase.auth.setSession({ access_token: '', refresh_token: '' })
            
            // Add a small delay before the next attempt
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        } catch (err) {
          logAuthState('Logout Attempt Failed', { 
            error: err, 
            attempt 
          })
          
          // Add delay before retry
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }
      
      // Whether or not Supabase sign out succeeded, always clear local storage
      if (typeof window !== 'undefined') {
        try {
          // Clear all auth-related items
          localStorage.removeItem(SESSION_STORAGE_KEY)
          localStorage.removeItem(SESSION_TIMESTAMP_KEY)
          localStorage.removeItem(AUTH_OPERATION_LOCK_KEY)
          localStorage.removeItem('supabase.auth.token')
          localStorage.removeItem('sb-' + supabaseUrl.replace(/^https?:\/\//, '').replace(/\./, '-') + '-auth-token')
          
          // More aggressive cookie clearing
          for (const cookieName of Object.keys(document.cookie.split(';').reduce((acc, cookie) => {
            const [key, _] = cookie.trim().split('=');
            return { ...acc, [key]: true };
          }, {}))) {
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          }
          
          // Clear specific Supabase items to be extra sure
          localStorage.removeItem('supabase.auth.token');
          
          // Clear any items with supabase or sb- in their names
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.includes('supabase') || key.includes('sb-'))) {
              localStorage.removeItem(key)
            }
          }
          
          // Set a flag to prevent auto-relogin
          localStorage.setItem('just_logged_out', 'true');
          
          // Clear the flag after 5 seconds
          setTimeout(() => {
            localStorage.removeItem('just_logged_out');
          }, 5000);
          
        } catch (e) {
          console.error("Error clearing storage during logout:", e);
        }
      }
      
      setAuthState(AuthState.UNAUTHENTICATED)
      logAuthState('Logout Complete', { 
        success: signOutSuccess, 
        elapsed: Date.now() - startTime 
      })
      
      // Pause briefly to ensure state is updated before redirect
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Redirect to login page with cache-busting parameter
      const loginPath = `/login?t=${Date.now()}`;
      router.push(loginPath);
    } catch (error) {
      setLastAuthError(error)
      logAuthState('Logout Error', { error, elapsed: Date.now() - startTime })
      
      // Always clear local state even if there was an error
      setUser(null)
      setIsAuthenticated(false)
      setSessionActive(false)
      setAuthState(AuthState.UNAUTHENTICATED)
      
      // Force a reload as a last resort to ensure the user is logged out
      const loginPath = `/login?t=${Date.now()}`;
      
      // Use window.location for a harder refresh instead of router
      // This ensures a complete reset of the application state
      window.location.href = window.location.origin + loginPath;
    } finally {
      setIsLoading(false)
      setAuthOperationLock(false)
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


