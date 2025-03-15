"use client"

import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { COUNTRY_NAMES } from "@/lib/constants"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, ChevronRight, ArrowLeft, Loader2 } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

// Inner component that uses useSearchParams
function DownloadSystemCostBenefitsContent(): React.ReactNode {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get("country") || "in")
  const [selectedScenario, setSelectedScenario] = useState(searchParams.get("scenario") || "baseline")
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState(searchParams.get("timeHorizon") || "2025")
  const [isDownloading, setIsDownloading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // Check authentication status
  useEffect(() => {
    if (!isLoading) {
      setAuthChecked(true)
      
      // If not authenticated, redirect to login with returnTo parameter
      if (!isAuthenticated) {
        const currentPath = window.location.pathname + window.location.search
        router.push(`/login?returnTo=${encodeURIComponent(currentPath)}`)
      }
    }
  }, [isAuthenticated, isLoading, router])

  // Scenarios for the dropdown (same as in system-cost-benefits.tsx)
  const scenarios = [
    { value: "baseline", label: "Baseline" },
    { value: "optimistic", label: "Optimistic" },
    { value: "conservative", label: "Conservative" },
  ]

  // Time horizons for the dropdown (same as in system-cost-benefits.tsx)
  const timeHorizons = [
    { value: "2025", label: "Until 2025" },
    { value: "2035", label: "Until 2035" },
  ]

  // Handle download button click
  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      // In a real app, you would call an API to generate and download the file
      // For demo purposes, we'll just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      // Redirect to the download URL
      window.location.href = `/api/download/system-cost-benefits?country=${selectedCountry}&scenario=${selectedScenario}&timeHorizon=${selectedTimeHorizon}`
    } catch (error) {
      console.error("Download error:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  // Handle country change
  const handleCountryChange = (country: string) => {
    setSelectedCountry(country)
    // Update URL with new country
    const params = new URLSearchParams(window.location.search)
    params.set("country", country)
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.pushState({}, "", newUrl)
  }

  // Handle scenario change
  const handleScenarioChange = (scenario: string) => {
    setSelectedScenario(scenario)
    // Update URL with new scenario
    const params = new URLSearchParams(window.location.search)
    params.set("scenario", scenario)
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.pushState({}, "", newUrl)
  }

  // Handle time horizon change
  const handleTimeHorizonChange = (timeHorizon: string) => {
    setSelectedTimeHorizon(timeHorizon)
    // Update URL with new time horizon
    const params = new URLSearchParams(window.location.search)
    params.set("timeHorizon", timeHorizon)
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.pushState({}, "", newUrl)
  }

  if (isLoading || !authChecked) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Download System Cost-Benefits Data</CardTitle>
            <CardDescription>
              Select parameters and download the data for your analysis
            </CardDescription>
          </div>
          <Link href="/system-cost-benefits" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-2">Country</h3>
            <Select value={selectedCountry} onValueChange={handleCountryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Scenario</h3>
            <Select value={selectedScenario} onValueChange={handleScenarioChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select scenario" />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((scenario) => (
                  <SelectItem key={scenario.value} value={scenario.value}>
                    {scenario.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Time Horizon</h3>
            <Select value={selectedTimeHorizon} onValueChange={handleTimeHorizonChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select time horizon" />
              </SelectTrigger>
              <SelectContent>
                {timeHorizons.map((horizon) => (
                  <SelectItem key={horizon.value} value={horizon.value}>
                    {horizon.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-center mt-6">
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full max-w-md"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing Download...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Data
              </>
            )}
          </Button>
        </div>
        <div className="text-center text-sm text-muted-foreground mt-4">
          <p>
            Data is provided in CSV format and includes all cost-benefit metrics for the selected parameters.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Wrapper component with Suspense boundary
export function DownloadSystemCostBenefits(): React.ReactNode {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    }>
      <DownloadSystemCostBenefitsContent />
    </Suspense>
  )
} 