"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname
      const searchParams = new URLSearchParams()
      searchParams.set('returnTo', currentPath)
      router.push(`/login?${searchParams.toString()}`)
    }
    
    // If admin-only route and user is not admin, redirect to dashboard
    if (!isLoading && isAuthenticated && adminOnly && user?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [isLoading, isAuthenticated, user, router, adminOnly])
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-forest" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    )
  }
  
  // If not authenticated or (admin-only and not admin), don't render children
  if (!isAuthenticated || (adminOnly && user?.role !== 'admin')) {
    return null
  }
  
  // Render children if authenticated and has proper permissions
  return <>{children}</>
}

