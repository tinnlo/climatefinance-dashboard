"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { useAuth, AuthState } from "@/lib/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, ShieldAlert } from "lucide-react"
import { GradientButton } from "@/components/ui/gradient-button"
import { SearchParamsProvider, useSearchParamsContext } from "../components/SearchParamsProvider"
import dynamic from "next/dynamic"

// Client-side only hook that safely checks for manual reset flag
function useManualResetCheck() {
  const [isReset, setIsReset] = useState(false);
  
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;
    
    try {
      // Initial check
      setIsReset(localStorage.getItem('auth_manual_reset') !== null);
      
      // Setup interval to keep checking (helps with race conditions)
      const intervalId = setInterval(() => {
        setIsReset(localStorage.getItem('auth_manual_reset') !== null);
      }, 500);
      
      return () => clearInterval(intervalId);
    } catch (e) {
      console.error("Error in manual reset check:", e);
    }
  }, []);
  
  return isReset;
}

function LoginContent() {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [info, setInfo] = useState("")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParamsContext()
  const returnTo = searchParams?.get('returnTo')
  const { 
    login, 
    register, 
    isLoading: authLoading, 
    user, 
    isAuthenticated, 
    refreshSession, 
    sessionExpiredMessage,
    clearSessionExpiredMessage,
    forceSignOut,
    authState
  } = useAuth()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCleanLogin, setShowCleanLogin] = useState(false)
  const [pageLoadTime] = useState(Date.now())
  const [isExplicitLoginPage, setIsExplicitLoginPage] = useState(true)
  const isManualReset = useManualResetCheck();

  // Check if user is already authenticated and redirect if needed
  useEffect(() => {
    let mounted = true;

    const logAuthStatus = () => {
      console.log("[Login Debug - Auth Status]", {
        isAuthenticated,
        authState,
        user: user?.email,
        isLoading: authLoading,
        isSubmitting,
        timestamp: new Date().toISOString(),
      });
    };

    // Log auth status on mount and state changes
    logAuthStatus();

    // Only attempt redirects if we're in an authenticated state
    // AND this is not from an explicit login attempt
    if (isAuthenticated && user && mounted && authState === AuthState.AUTHENTICATED && !isExplicitLoginPage) {
      console.log("[Login Debug - Already Authenticated, Redirecting]", {
        user: user.email,
        role: user.role,
        returnTo,
        timestamp: new Date().toISOString(),
      });
      
      const targetPath = returnTo || (user.role === "admin" ? "/admin/users" : "/dashboard")
      const redirectPath = `${targetPath}${targetPath.includes('?') ? '&' : '?'}auth_redirect=true`
      
      console.log("[Login Debug - Auto Redirecting]", { redirectPath });
      router.push(redirectPath)
    }

    // Check if we should show clean login option
    const shouldShowCleanLogin = authState === AuthState.ERROR || 
      (authLoading && Date.now() - pageLoadTime > 5000);
    
    if (shouldShowCleanLogin !== showCleanLogin) {
      setShowCleanLogin(shouldShowCleanLogin);
    }

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user, returnTo, router, authState, authLoading, showCleanLogin, pageLoadTime, isSubmitting, isExplicitLoginPage]);

  // When in the explicit login page, disable automatic authentication checks
  // and clear any existing auth operations
  useEffect(() => {
    // Flag to indicate we're on the explicit login page
    setIsExplicitLoginPage(true);
    
    // Clear any existing auth operation locks immediately when on login page
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('auth_operation_lock');
      } catch (e) {
        console.error("Error clearing auth operation lock:", e);
      }
    }
    
    // Force sign out to ensure clean login state
    if (pathname === '/login') {
      console.log("[Login Debug - Explicit Login Page] Disabling automatic authentication checks");
      
      // Either clear auth errors or perform full sign out if in error state
      if (authState === AuthState.ERROR) {
        forceSignOut();
      }
    }
  }, [pathname, authState, forceSignOut]);

  useEffect(() => {
    // Log the returnTo parameter for debugging
    if (returnTo) {
      console.log("[Login Debug - ReturnTo]", {
        returnTo,
        timestamp: new Date().toISOString(),
      });
    }
  }, [returnTo]);

  // Add a timeout to detect stuck authentication 
  useEffect(() => {
    // Only set a timeout for auth loading states that take too long
    if (!authLoading || isSubmitting) return;
    
    const timeoutId = setTimeout(() => {
      // Only proceed if we're still loading
      if (authLoading) {
        console.log("[Login Debug - Timeout] Auth loading stuck for too long");
        setShowCleanLogin(true);
      }
    }, 8000); // 8 seconds timeout
    
    return () => clearTimeout(timeoutId);
  }, [authLoading, isSubmitting]);

  // Clear auth locks on visibility change (when user returns to tab)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pathname === '/login') {
        console.log("[Login Debug - Visibility Change] Clearing auth locks on tab focus");
        try {
          localStorage.removeItem('auth_operation_lock');
        } catch (e) {
          console.error("Error clearing auth operation lock:", e);
        }
      }
    };
    
    // Clear locks on initial page load
    try {
      localStorage.removeItem('auth_operation_lock');
    } catch (e) {
      console.error("Error clearing auth operation lock:", e);
    }
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);

  // Function to handle force clean login
  const handleForceCleanLogin = async () => {
    console.log("[Login Debug - Force Clean Login Requested]");
    
    setError("");
    setSuccess("");
    setInfo("Resetting authentication state...");
    setIsSubmitting(true);
    
    // Mark that we're in a manual reset state - this will be used to prevent other auth processes
    const resetFlag = `auth_manual_reset_${Date.now()}`;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('auth_manual_reset', resetFlag);
      } catch (e) {
        console.error("Error setting manual reset flag:", e);
      }
    }
    
    // Clear any existing auth operation locks immediately
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('auth_operation_lock');
        localStorage.removeItem('auth_session_active');
        localStorage.removeItem('auth_session_timestamp');
        
        // Clear any Supabase tokens to force a clean slate
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.error("Error clearing auth operation lock:", e);
      }
    }
    
    try {
      // Force sign out via auth context
      await forceSignOut();
      
      // Clear form fields
      setEmail("");
      setPassword("");
      
      // Update UI
      setInfo("Authentication has been reset. Please try logging in again.");
      setShowCleanLogin(false);
      
      // Instead of waiting for authLoading to clear, force a page reload after a brief delay
      // This ensures a completely fresh start
      setTimeout(() => {
        console.log("[Login Debug - Forcing page reload after reset]");
        if (typeof window !== 'undefined') {
          // Add cache-busting query param
          window.location.href = window.location.pathname + "?reset=" + Date.now();
        }
      }, 1500);
    } catch (err) {
      console.error("[Login Debug - Force Clean Error]", err);
      setError("Failed to reset authentication state. Please refresh the page.");
      
      // Even on error, force a page reload
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to clear expiry message when user interacts
  const handleInputInteraction = () => {
    if (sessionExpiredMessage) {
      clearSessionExpiredMessage()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    
    setError("")
    setSuccess("")
    setInfo("")
    setIsSubmitting(true)
    setShowCleanLogin(false)
    // When user explicitly tries to log in, set this flag to false to allow redirects
    setIsExplicitLoginPage(false)

    // Clear any authentication locks before attempting login
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('auth_operation_lock');
      } catch (e) {
        console.error("Error clearing auth operation lock:", e);
      }
    }

    console.log("[Login Debug - Submit]", {
      isLogin,
      email,
      returnTo,
      timestamp: new Date().toISOString(),
    });

    try {
      if (isLogin) {
        const result = await login(email, password, false)
        
        // If we get an auth operation in progress error, try again after clearing locks
        if (!result.success && result.message === "Another authentication operation is in progress") {
          console.log("[Login Debug - Auth Operation Conflict] Clearing locks and retrying");
          
          // Wait a moment for any existing operations to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Retry the login
          const retryResult = await login(email, password, false);
          if (retryResult.success) {
            // Use the retry result instead
            console.log("[Login Debug - Retry Successful]");
            result.success = retryResult.success;
            result.message = retryResult.message;
            result.redirectTo = retryResult.redirectTo;
          } else {
            // If still failing, force a clean login instead of showing error
            console.log("[Login Debug - Retry Failed] Forcing clean login");
            await handleForceCleanLogin();
            setIsSubmitting(false);
            return;
          }
        }
        
        console.log("[Login Debug - Result]", {
          success: result.success,
          message: result.message,
          redirectTo: result.redirectTo,
          returnTo,
          timestamp: new Date().toISOString(),
        });
        
        if (result.success && result.redirectTo) {
          setSuccess("Login successful! Redirecting...")
          const path = result.redirectTo
          console.log("[Login Debug - Redirecting]", {
            path,
            timestamp: new Date().toISOString(),
          })
          
          await new Promise(resolve => setTimeout(resolve, 500))
          
          try {
            const redirectPath = `${path}${path.includes('?') ? '&' : '?'}auth_redirect=true`
            console.log("[Login Debug - Adding auth_redirect]", { redirectPath });
            router.push(redirectPath)
          } catch (err) {
            console.error("[Login Debug - Router Error]", err)
            const baseUrl = window.location.origin
            const fullPath = path.startsWith('/') ? path : `/${path}`
            window.location.href = `${baseUrl}${fullPath}${fullPath.includes('?') ? '&' : '?'}auth_redirect=true`
          }
        } else {
          console.log("[Login Debug - Failure]", { message: result.message });
          
          // Handle all possible error cases
          if (result.message === "User data not found. Please contact support.") {
            // This is the message we get for unverified users
            setError("")
            setSuccess("")
            setInfo("Your account is pending admin verification. Please wait for an admin to verify your account before logging in.")
          } else if (result.message.includes("Invalid login credentials")) {
            setError("Invalid email or password. Please try again.")
            setSuccess("")
            setInfo("")
          } else if (result.message.includes("Email not confirmed")) {
            setError("")
            setSuccess("")
            setInfo("Please check your email to confirm your account before logging in.")
          } else if (result.message.includes("system error")) {
            setError("We're experiencing technical difficulties. Please try again later or contact support.")
            setSuccess("")
            setInfo("")
          } else {
            // For any other unexpected errors
            setError(result.message)
            setSuccess("")
            setInfo("")
            // Show clean login option for unexpected errors
            setShowCleanLogin(true)
          }
        }
      } else {
        if (!name) {
          setError("Name is required")
          setIsSubmitting(false)
          return
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          setIsSubmitting(false)
          return
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters long")
          setIsSubmitting(false)
          return
        }
        const result = await register(name, email, password)
        if (result.success) {
          setSuccess("Registration successful! Please wait for admin approval before logging in.")
          setIsLogin(true)
          setName("")
          setEmail("")
          setPassword("")
          setConfirmPassword("")
        } else {
          // Handle specific error messages
          if (result.message.includes("violates row-level security policy")) {
            // This is likely a false error, the user might have been created successfully
            console.log("[Login Debug - RLS Error]", { message: result.message });
            setSuccess("Registration may have been successful. Please try logging in after a few minutes.")
            setIsLogin(true)
            setName("")
            setEmail("")
            setPassword("")
            setConfirmPassword("")
          } else {
            setError(result.message)
            // Show clean login option for registration errors
            setShowCleanLogin(true)
          }
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error(err)
      // Show clean login option for unexpected errors
      setShowCleanLogin(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show appropriate form fields and buttons based on current state
  const renderForm = () => {
    // Special state: System is in authentication error state
    if (authState === AuthState.ERROR && !isSubmitting) {
      return (
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              There was a problem with the authentication system. Please reset your login session.
            </AlertDescription>
          </Alert>
          
          <Button 
            className="w-full"
            onClick={handleForceCleanLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Resetting...</span>
              </div>
            ) : "Reset Authentication"}
          </Button>
        </div>
      );
    }
    
    // Normal login/signup form
    return (
      <div className="space-y-6">
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="login-input bg-transparent"
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              handleInputInteraction()
            }}
            onFocus={handleInputInteraction}
            className="login-input bg-transparent"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              handleInputInteraction()
            }}
            onFocus={handleInputInteraction}
            className="login-input bg-transparent"
            required
          />
        </div>
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="login-input bg-transparent"
              required
            />
          </div>
        )}
        {sessionExpiredMessage && (
          <Alert>
            <AlertDescription>{sessionExpiredMessage}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        {info && (
          <Alert>
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{isLogin ? "Login" : "Create an account"}</CardTitle>
            <CardDescription>
              {isLogin
                ? "Enter your email and password to login to your account"
                : "Enter your details to create a new account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6" id="login-form">
              <style jsx global>{`
                /* Set consistent colors for all inputs */
                input {
                  color: rgb(20, 40, 30);
                  background-color: rgb(240, 245, 243);
                }
                
                .dark input {
                  color: rgb(167, 243, 208);
                  background-color: rgb(20, 33, 27);
                }
                
                /* Light mode autofill styles */
                input:-webkit-autofill {
                  -webkit-box-shadow: 0 0 0 30px rgb(240, 245, 243) inset !important;
                  -webkit-text-fill-color: rgb(20, 40, 30) !important;
                  /* Extremely long transition to prevent browser from reverting styles */
                  transition: background-color 500000s 0s, color 500000s 0s !important;
                }
                
                /* Additional light mode styles to reinforce */
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus,
                input:-webkit-autofill:active {
                  -webkit-box-shadow: 0 0 0 30px rgb(240, 245, 243) inset !important;
                  -webkit-text-fill-color: rgb(20, 40, 30) !important;
                }
                
                /* Dark mode autofill styles */
                .dark input:-webkit-autofill {
                  -webkit-box-shadow: 0 0 0 30px rgb(20, 33, 27) inset !important;
                  -webkit-text-fill-color: rgb(167, 243, 208) !important;
                  /* Extremely long transition to prevent browser from reverting styles */
                  transition: background-color 500000s 0s, color 500000s 0s !important;
                }
                
                /* Additional dark mode styles to reinforce */
                .dark input:-webkit-autofill:hover,
                .dark input:-webkit-autofill:focus,
                .dark input:-webkit-autofill:active {
                  -webkit-box-shadow: 0 0 0 30px rgb(20, 33, 27) inset !important;
                  -webkit-text-fill-color: rgb(167, 243, 208) !important;
                }
                
                /* Force identical appearance between normal and autofilled inputs */
                input, input:-webkit-autofill {
                  font-size: 1rem !important;
                  line-height: 1.5 !important;
                }
                
                /* Try to intercept browser reversion */
                @keyframes autofillFix {
                  from {}
                  to {}
                }
                
                input:-webkit-autofill {
                  animation-name: autofillFix;
                  animation-duration: 500000s;
                  animation-iteration-count: 1;
                }
              `}</style>
              
              {/* Always show reset button at top when having auth errors */}
              {authState === AuthState.ERROR && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Authentication system error detected. Please reset your login session.
                  </AlertDescription>
                  <Button 
                    variant="destructive"
                    className="w-full mt-2"
                    onClick={handleForceCleanLogin}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Resetting...</span>
                      </div>
                    ) : "Reset Authentication"}
                  </Button>
                </Alert>
              )}
              
              {renderForm()}
              
              <div className="pt-6">
                <GradientButton
                  type="submit"
                  className="w-full h-12 relative"
                  disabled={isSubmitting || (authLoading && !info.includes("Authentication has been reset") && !isManualReset)}
                >
                  <div className="flex items-center justify-center space-x-2">
                    {(isSubmitting || (authLoading && !info.includes("Authentication has been reset") && !isManualReset)) && 
                      <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{isLogin ? "Login" : "Create Account"}</span>
                  </div>
                </GradientButton>
                
                {/* Show clean login button in certain conditions */}
                {(showCleanLogin || authLoading) && authState !== AuthState.ERROR && (
                  <Button
                    variant="link"
                    onClick={handleForceCleanLogin}
                    className="w-full mt-2 text-sm text-muted-foreground hover:text-primary"
                    disabled={isSubmitting || isManualReset}
                  >
                    <ShieldAlert className="mr-1 h-3 w-3" />
                    Having trouble? Reset authentication
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button
              variant="link"
              className="w-full"
              onClick={() => {
                setIsLogin(!isLogin)
                setError("")
                setSuccess("")
                setInfo("")
              }}
              disabled={isSubmitting || (authLoading && !info.includes("Authentication has been reset") && !isManualReset)}
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}

// Create a component that only renders on the client side
const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <div className="flex min-h-screen items-center justify-center">Loading authentication...</div>;
  }
  
  return <>{children}</>;
};

// Wrap LoginContent with ClientOnly
function LoginContentWrapper() {
  return (
    <ClientOnly>
      <LoginContent />
    </ClientOnly>
  );
}

export default function LoginPage() {
  return (
    <SearchParamsProvider>
      <LoginContentWrapper />
    </SearchParamsProvider>
  )
}

