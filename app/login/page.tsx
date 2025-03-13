"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const { login, register, isLoading, user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    console.log("[Login Debug - Submit]", {
      isLogin,
      email,
      timestamp: new Date().toISOString(),
    });

    try {
      if (isLogin) {
        const result = await login(email, password)
        console.log("[Login Debug - Result]", {
          success: result.success,
          message: result.message,
          redirectTo: result.redirectTo,
          timestamp: new Date().toISOString(),
        });
        
        if (result.success && result.redirectTo) {
          setSuccess("Login successful! Redirecting...")
          // Immediate redirect without delay
          window.location.replace(result.redirectTo);
        } else {
          console.log("[Login Debug - Failure]", { message: result.message });
          if (result.message.includes("pending approval") || result.message.includes("waiting for the institute")) {
            setError("")
            setSuccess(result.message)
          } else if (result.message.includes("Email not confirmed")) {
            setError("Please check your email to confirm your account before logging in.")
          } else if (result.message.includes("Invalid login credentials")) {
            setError("Invalid email or password. Please try again.")
          } else if (result.message.includes("system error")) {
            setError("We're experiencing technical difficulties. Please try again later or contact support.")
          } else {
            setError(result.message)
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
          setError(result.message)
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error(err)
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
                      className="bg-black/80 border-forest/20 focus:border-forest/30 placeholder:text-forest-foreground/50"
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
                    className="bg-black/80 border-forest/20 focus:border-forest/30 placeholder:text-forest-foreground/50"
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
                    className="bg-black/80 border-forest/20 focus:border-forest/30 placeholder:text-forest-foreground/50"
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
                      className="bg-black/80 border-forest/20 focus:border-forest/30 placeholder:text-forest-foreground/50"
                    />
                  </div>
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="bg-forest/20 text-forest-foreground border-forest/30">
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full mt-6 relative bg-gradient-to-r from-black to-forest hover:from-black/90 hover:to-forest/90 text-white transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden group" 
                disabled={isLoading}
              >
                <span className="relative z-10">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                      {isLogin ? "Logging in..." : "Registering..."}
                    </>
                  ) : isLogin ? (
                    "Login"
                  ) : (
                    "Register"
                  )}
                </span>
                <div className="absolute -inset-1 bg-gradient-to-r from-black to-forest rounded-full blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
              </Button>
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

