"use client"

import { ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Loader2 } from 'lucide-react'

interface ProtectedContentProps {
  children: ReactNode
  fallback?: ReactNode
  loadingFallback?: ReactNode
}

export function ProtectedContent({ 
  children, 
  fallback = null,
  loadingFallback = (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}: ProtectedContentProps) {
  const { isAuthenticated, isLoading, isInitialized } = useAuth()

  // Show loading state while auth is initializing
  if (!isInitialized || isLoading) {
    return <>{loadingFallback}</>
  }

  // Show fallback if not authenticated
  if (!isAuthenticated) {
    return <>{fallback}</>
  }

  // Show protected content
  return <>{children}</>
} 