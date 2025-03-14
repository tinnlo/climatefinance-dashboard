"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { GradientButton } from "@/components/ui/gradient-button"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [info, setInfo] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const { login, register, isLoading: authLoading, user, isAuthenticated, refreshSession } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if user is already authenticated and redirect if needed
  useEffect(() => {
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
    } else {
      // Try to refresh the session on page load
      refreshSession();
    }
  }, [isAuthenticated, user, returnTo, router, refreshSession]);

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
          // Use returnTo from URL if available, otherwise use the result.redirectTo
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
          if (result.message.includes("pending approval") || result.message.includes("account setup is incomplete") || result.message.includes("notify you when")) {
            // Use info style for pending approval messages
            setError("")
            setSuccess("")
            setInfo(result.message)
          } else if (result.message.includes("Email not confirmed")) {
            // Use info style for email confirmation messages
            setError("")
            setSuccess("")
            setInfo("Please check your email to confirm your account before logging in.")
          } else if (result.message.includes("Invalid login credentials")) {
            setError("Invalid email or password. Please try again.")
            setSuccess("")
            setInfo("")
          } else if (result.message.includes("system error")) {
            setError("We're experiencing technical difficulties. Please try again later or contact support.")
            setSuccess("")
            setInfo("")
          } else if (result.message.includes("User data not found") || result.message.includes("Account setup incomplete")) {
            // Use info style for account setup issues
            setError("")
            setSuccess("")
            setInfo("Your account may need additional setup. Please check your email or contact support.")
          } else {
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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background/95 to-forest/30">
      <Header />
      <main className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{isLogin ? "Login" : "Register"}</CardTitle>
            <CardDescription>
              {isLogin ? "Enter your credentials to access your account" : "Create an account to download data"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      required
                      className="bg-white dark:bg-black/80 border-forest/20 focus:border-forest/50 placeholder:text-forest-foreground/50 [&:-webkit-autofill]:bg-forest-50/20 [&:-webkit-autofill]:!text-forest-foreground [&:-webkit-autofill_-webkit-text-fill-color]:text-forest-foreground"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="bg-white dark:bg-black/80 border-forest/20 focus:border-forest/50 placeholder:text-forest-foreground/50 [&:-webkit-autofill]:bg-forest-50/20 [&:-webkit-autofill]:!text-forest-foreground [&:-webkit-autofill_-webkit-text-fill-color]:text-forest-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="bg-white dark:bg-black/80 border-forest/20 focus:border-forest/50 placeholder:text-forest-foreground/50 [&:-webkit-autofill]:bg-forest-50/20 [&:-webkit-autofill]:!text-forest-foreground [&:-webkit-autofill_-webkit-text-fill-color]:text-forest-foreground"
                  />
                </div>
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                      className="bg-white dark:bg-black/80 border-forest/20 focus:border-forest/50 placeholder:text-forest-foreground/50 [&:-webkit-autofill]:bg-forest-50/20 [&:-webkit-autofill]:!text-forest-foreground [&:-webkit-autofill_-webkit-text-fill-color]:text-forest-foreground"
                    />
                  </div>
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert variant="info">
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}
                {info && (
                  <Alert variant="info">
                    <AlertDescription>{info}</AlertDescription>
                  </Alert>
                )}
              </div>
              <GradientButton 
                type="submit" 
                className="w-full mt-6"
                isLoading={authLoading}
                loadingText={isLogin ? "Logging in..." : "Registering..."}
                variant="primary"
              >
                {isLogin ? "Login" : "Register"}
              </GradientButton>
            </form>
          </CardContent>
          <CardFooter>
            <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="w-full text-muted-foreground hover:text-muted-foreground/90">
              {isLogin ? "Need an account? Register" : "Already have an account? Login"}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}

