"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
    if (isAuthenticated && user && mounted && authState === AuthState.AUTHENTICATED) {
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
  }, [isAuthenticated, user, returnTo, router, authState, authLoading, showCleanLogin, pageLoadTime, isSubmitting]);

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

  // Function to handle force clean login
  const handleForceCleanLogin = async () => {
    console.log("[Login Debug - Force Clean Login Requested]");
    
    setError("");
    setSuccess("");
    setInfo("Resetting authentication state...");
    setIsSubmitting(true);
    
    try {
      // First, force sign out via auth context
      await forceSignOut();
      
      // Clear form fields
      setEmail("");
      setPassword("");
      
      // Update UI
      setInfo("Authentication has been reset. Please try logging in again.");
      setShowCleanLogin(false);
    } catch (err) {
      console.error("[Login Debug - Force Clean Error]", err);
      setError("Failed to reset authentication state. Please try refreshing the page.");
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

    console.log("[Login Debug - Submit]", {
      isLogin,
      email,
      returnTo,
      timestamp: new Date().toISOString(),
    });

    try {
      if (isLogin) {
        const result = await login(email, password, false)
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
                  disabled={isSubmitting || authLoading || authState === AuthState.ERROR}
                >
                  <div className="flex items-center justify-center space-x-2">
                    {(isSubmitting || authLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{isLogin ? "Login" : "Create Account"}</span>
                  </div>
                </GradientButton>
                
                {/* Show clean login button in certain conditions */}
                {showCleanLogin && authState !== AuthState.ERROR && (
                  <Button
                    variant="link"
                    onClick={handleForceCleanLogin}
                    className="w-full mt-2 text-sm text-muted-foreground hover:text-primary"
                    disabled={isSubmitting}
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
              disabled={isSubmitting || authLoading || authState === AuthState.ERROR}
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <SearchParamsProvider>
      <LoginContent />
    </SearchParamsProvider>
  )
}

