"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
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
  const { login, register, isLoading: authLoading, user, isAuthenticated, refreshSession } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if user is already authenticated and redirect if needed
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      if (!mounted) return;
      
      try {
        if (isAuthenticated && user) {
          console.log("[Login Debug - Already Authenticated]", {
            user: user.email,
            role: user.role,
            returnTo,
            timestamp: new Date().toISOString(),
          });
          
          // If already authenticated, redirect to the returnTo path or default dashboard
          const targetPath = returnTo || (user.role === "admin" ? "/admin/users" : "/dashboard")
          const redirectPath = `${targetPath}${targetPath.includes('?') ? '&' : '?'}auth_redirect=true`
          
          console.log("[Login Debug - Auto Redirecting]", { redirectPath });
          router.push(redirectPath)
        } else if (!authLoading) {
          // Only refresh session if we're not already loading
          await refreshSession();
        }
      } catch (error) {
        console.error("[Login Debug - Auth Error]", error);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user, returnTo, router, refreshSession, authLoading]);

  useEffect(() => {
    // Log the returnTo parameter for debugging
    if (returnTo) {
      console.log("[Login Debug - ReturnTo]", {
        returnTo,
        timestamp: new Date().toISOString(),
      });
    }
  }, [returnTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    
    setError("")
    setSuccess("")
    setInfo("")
    setIsSubmitting(true)

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
          }
        }
      } else {
        if (!name) {
          setError("Name is required")
          return
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          return
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters long")
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
          }
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

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
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <style jsx global>{`
                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus {
                  -webkit-box-shadow: 0 0 0 30px rgb(20, 33, 27) inset !important;
                  -webkit-text-fill-color: rgb(167, 243, 208) !important;
                  caret-color: rgb(167, 243, 208) !important;
                }
              `}</style>
              <div className="space-y-6">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
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
                    onChange={(e) => setEmail(e.target.value)}
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
                    onChange={(e) => setPassword(e.target.value)}
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
                      required
                    />
                  </div>
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
              <div className="pt-6">
                <GradientButton
                  type="submit"
                  className="w-full h-12 relative"
                  disabled={isSubmitting || authLoading}
                >
                  <div className="flex items-center justify-center space-x-2">
                    {(isSubmitting || authLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{isLogin ? "Login" : "Create Account"}</span>
                  </div>
                </GradientButton>
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
              }}
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

