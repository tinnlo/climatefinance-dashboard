"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, refreshSession } = useAuth()
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshAttempts, setRefreshAttempts] = useState(0)

  useEffect(() => {
    console.log('[ProtectedRoute Debug] State:', {
      isLoading,
      isAuthenticated,
      user,
      adminOnly,
      refreshAttempts,
      path: typeof window !== 'undefined' ? window.location.pathname : 'server-side',
      timestamp: new Date().toISOString(),
    });

    // Only try to refresh a limited number of times to prevent infinite loops
    const MAX_REFRESH_ATTEMPTS = 2;

    // Try to refresh the session if not authenticated and not loading
    if (!isLoading && !isAuthenticated && refreshAttempts < MAX_REFRESH_ATTEMPTS) {
      console.log('[ProtectedRoute Debug] Attempting to refresh session');
      setIsRefreshing(true);
      refreshSession().finally(() => {
        setIsRefreshing(false);
        setRefreshAttempts(prev => prev + 1);
      });
      return;
    }

    // Let the middleware handle redirects for unauthenticated users
    // Only handle role-based access control here
    if (!isLoading && isAuthenticated && adminOnly && user?.role !== "admin") {
      console.log('[ProtectedRoute Debug] Not admin, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }
  }, [isLoading, isAuthenticated, user, adminOnly, router, refreshSession, refreshAttempts]);

  // Show loading state when initially loading or actively refreshing the session
  if (isLoading || isRefreshing) {
    console.log('[ProtectedRoute Debug] Showing loading state');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  // Let the middleware handle redirects for unauthenticated users
  // Only handle role-based access control here
  if (isAuthenticated && adminOnly && user?.role !== "admin") {
    console.log('[ProtectedRoute Debug] Access denied - not admin', {
      isAuthenticated,
      userRole: user?.role,
      adminOnly,
    });
    return null;
  }

  // If we've tried refreshing multiple times and still not authenticated,
  // let the middleware handle the redirect
  if (!isAuthenticated && refreshAttempts >= 2) {
    console.log('[ProtectedRoute Debug] Not authenticated after refresh attempts');
    return null;
  }

  console.log('[ProtectedRoute Debug] Rendering protected content');
  return <>{children}</>;
}

