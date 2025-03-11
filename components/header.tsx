"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { SearchCountry } from "@/components/search-country"
import { useTheme } from "next-themes"

export function Header({
  selectedCountry = "in",
  onCountryChange,
}: {
  selectedCountry?: string
  onCountryChange?: (country: string) => void
}) {
  const pathname = usePathname()
  const { theme } = useTheme()

  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
          <div className="flex flex-col space-y-4">
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
            {onCountryChange && <SearchCountry onCountryChange={onCountryChange} defaultValue={selectedCountry} />}
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
              href="/analytics"
              className={`transition-colors hover:text-foreground/80 ${
                pathname === "/analytics" ? "font-bold text-foreground" : "text-foreground/60"
              }`}
            >
              Analytics
            </Link>
            <Link
              href="/contact"
              className={`transition-colors hover:text-foreground/80 ${
                pathname === "/contact" ? "font-bold text-foreground" : "text-foreground/60"
              }`}
            >
              Contact
            </Link>
            <ModeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}

