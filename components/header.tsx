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
  const { user, logout, forceSignOut, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      
      // Attempt normal logout first
      await logout()
      console.log("[Header] Logout successful")
      
      // Router push happens inside logout function
    } catch (err) {
      console.error("[Header] Logout failed:", err)
      
      // If regular logout fails, try force sign out as fallback
      try {
        console.log("[Header] Attempting force sign out...")
        await forceSignOut()
        console.log("[Header] Force sign out successful")
        
        // Redirect after force sign out
        router.push("/login")
      } catch (forceErr) {
        console.error("[Header] Force sign out failed:", forceErr)
        
        // Last resort: Reload the page
        window.location.href = "/login"
      }
    } finally {
      setIsLoggingOut(false)
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

