"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background/95 to-forest/30">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-6xl font-bold text-forest mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <Button asChild>
            <Link href="/dashboard">
              Return to Dashboard
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
} 