"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DownloadStackedCostPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the new stacked-data page with cost tab selected
    router.replace("/downloads/stacked-data?type=cost")
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting to new downloads page...</p>
    </div>
  )
} 