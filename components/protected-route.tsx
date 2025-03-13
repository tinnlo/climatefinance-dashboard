"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('[ProtectedRoute Debug] State:', {
      isLoading,
      isAuthenticated,
      user,
      adminOnly,
      path: typeof window !== 'undefined' ? window.location.pathname : 'server-side',
      timestamp: new Date().toISOString(),
    });

    if (!isLoading && !isAuthenticated) {
      console.log('[ProtectedRoute Debug] Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    if (!isLoading && adminOnly && user?.role !== "admin") {
      console.log('[ProtectedRoute Debug] Not admin, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }
  }, [isLoading, isAuthenticated, user, adminOnly, router]);

  if (isLoading) {
    console.log('[ProtectedRoute Debug] Showing loading state');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  if (!isAuthenticated || (adminOnly && user?.role !== "admin")) {
    console.log('[ProtectedRoute Debug] Access denied', {
      isAuthenticated,
      userRole: user?.role,
      adminOnly,
    });
    return null;
  }

  console.log('[ProtectedRoute Debug] Rendering protected content');
  return <>{children}</>;
}

