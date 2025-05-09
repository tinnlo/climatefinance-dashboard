"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Settings, LogOut, User, RefreshCw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ClientOnly from "../app/components/ClientOnly"
import { useState } from "react"

// The actual header content component
function HeaderContent({
  selectedCountry = "in",
  onCountryChange,
}: {
  selectedCountry?: string
  onCountryChange?: (country: string) => void
}) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    // If already logging out, prevent duplicate attempts
    if (isLoggingOut) return
    
    try {
      setIsLoggingOut(true)
      
      // Clear any existing auth operation locks
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('auth_operation_lock');
        } catch (e) {
          console.error("Error clearing auth operation lock:", e);
        }
      }
      
      // Attempt normal logout first
      console.log("[Header] Starting logout process")
      await logout()
      console.log("[Header] Logout successful")
      
      // Router push happens inside logout function
    } catch (err) {
      console.error("[Header] Logout failed:", err)
      
      // If regular logout fails, use manual cleanup as fallback
      try {
        console.log("[Header] Attempting manual cleanup...")
        
        // Clear any auth locks again
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('auth_operation_lock');
          } catch (e) {
            console.error("Error clearing auth operation lock:", e);
          }
        }
        
        // Manual cleanup
        try {
          // More aggressive cleanup
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_session_active');
            localStorage.removeItem('auth_session_timestamp');
            localStorage.removeItem('auth_operation_lock');
            
            // Set logout flag
            localStorage.setItem('just_logged_out', 'true');
            
            // Clear supabase tokens
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes('supabase') || key.includes('sb-'))) {
                localStorage.removeItem(key);
              }
            }
          }
        } catch (e) {
          console.error("[Header] Error clearing storage:", e);
        }
        
        // Redirect to login page
        setTimeout(() => {
          router.push("/login")
        }, 300)
      } catch (cleanupErr) {
        console.error("[Header] Manual cleanup failed:", cleanupErr)
        
        // Last resort: Hard reload to login page
        window.location.href = window.location.origin + "/login?forcedLogout=true"
      }
    } finally {
      // Make sure we always reset the logging out state after a delay
      // This ensures the state is reset even if navigation occurs
      setTimeout(() => {
        setIsLoggingOut(false);
      }, 1000);
    }
  }

  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="min-w-[220px] w-[240px] md:w-[300px]">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Forward_Global_Institute-emDMJscw6WE7xR8LftbOB61EcXg6o4.png"
                  alt="Forward Global Institute"
                  width={300}
                  height={75}
                  className={`w-full h-auto ${theme === "light" ? "invert" : ""}`}
                  priority
                />
              </div>
            </Link>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/dashboard"
              className={`transition-colors hover:text-foreground/80 ${
                pathname === "/dashboard" ? "font-bold text-foreground" : "text-foreground/60"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/downloads"
              className={`transition-colors hover:text-foreground/80 ${
                pathname?.startsWith("/downloads") ? "font-bold text-foreground" : "text-foreground/60"
              }`}
            >
              Downloads
            </Link>
            <Link
              href="/contact"
              className={`transition-colors hover:text-foreground/80 ${
                pathname === "/contact" ? "font-bold text-foreground" : "text-foreground/60"
              }`}
            >
              Contact
            </Link>
            {isAuthenticated ? (
              <>
                {user?.role === "admin" && (
                  <Link
                    href="/admin/users"
                    className={`transition-colors hover:text-foreground/80 ${
                      pathname?.startsWith("/admin") ? "font-bold text-foreground" : "text-foreground/60"
                    }`}
                  >
                    Admin
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-foreground/60 hover:text-foreground">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex w-full cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Account Management
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer" disabled={isLoggingOut}>
                      {isLoggingOut ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Logging out...
                        </>
                      ) : (
                        <>
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link
                href="/login"
                className={`transition-colors hover:text-foreground/80 ${
                  pathname === "/login" ? "font-bold text-foreground" : "text-foreground/60"
                }`}
              >
                Login
              </Link>
            )}
            <ModeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}

// Export a wrapped version of the header that uses ClientOnly
export function Header(props: {
  selectedCountry?: string
  onCountryChange?: (country: string) => void
}) {
  return (
    <ClientOnly fallback={
      <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
            <div className="flex items-center">
              <div className="min-w-[220px] w-[240px] md:w-[300px]">
                <div className="w-full h-[75px]" /> {/* Placeholder for logo */}
              </div>
            </div>
          </div>
        </div>
      </header>
    }>
      <HeaderContent {...props} />
    </ClientOnly>
  )
}

