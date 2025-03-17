"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { COUNTRY_NAMES } from "@/lib/constants"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useSearchParamsContext } from "@/app/components/SearchParamsProvider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

// Import the cost variables from the stacked-cost-chart component
const COST_VARIABLES = [
  { id: "cost_battery_grid", name: "Grid Battery Cost", color: "#d67f55" },
  { id: "cost_battery_long", name: "Long-term Battery Cost", color: "#ad8267" },
  { id: "cost_battery_pe", name: "PE Battery Cost", color: "#848579" },
  { id: "cost_battery_short", name: "Short-term Battery Cost", color: "#5b888b" },
  { id: "investment_cost", name: "Investment Cost", color: "#329b9d" },
  { id: "opportunity_cost", name: "Opportunity Cost", color: "#00B4D8" },
]

export function DownloadStackedCost() {
  const searchParams = useSearchParamsContext()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [selectedCountry, setSelectedCountry] = useState(searchParams?.get("country") || "in")
  const [selectedVariables, setSelectedVariables] = useState<string[]>(COST_VARIABLES.map(v => v.id))
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDownloadingPreset, setIsDownloadingPreset] = useState(false)
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

  const toggleVariable = (variableId: string) => {
    setSelectedVariables((prev) =>
      prev.includes(variableId) ? prev.filter((id) => id !== variableId) : [...prev, variableId]
    )
  }

  // Function to download custom data with selected variables
  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      // Create header row with selected variables
      const selectedVarNames = COST_VARIABLES
        .filter(v => selectedVariables.includes(v.id))
        .map(v => v.name)
      
      const headerRow = ["Year", "Country", ...selectedVarNames, "Total Cost"].join(",")
      
      // Create sample data rows (2025-2050)
      const dataRows = []
      for (let year = 2025; year <= 2050; year++) {
        const rowValues = [year, COUNTRY_NAMES[selectedCountry]]
        
        // Add values for each selected variable
        let totalCost = 0
        for (const variable of COST_VARIABLES) {
          if (selectedVariables.includes(variable.id)) {
            // Generate a random value between 0.1 and 2.0 for demonstration
            const value = (Math.random() * 1.9 + 0.1).toFixed(2)
            rowValues.push(value)
            totalCost += parseFloat(value)
          }
        }
        
        // Add total cost
        rowValues.push(totalCost.toFixed(2))
        dataRows.push(rowValues.join(","))
      }
      
      // Combine header and data rows
      const csvContent = [headerRow, ...dataRows].join("\n")

      // Create a blob and download it
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `stacked_cost_data_${selectedCountry}_custom.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading file:", error)
      // Handle error here
    } finally {
      setIsDownloading(false)
    }
  }

  // Function to download preset data with all variables
  const handleDownloadPreset = async (format: 'csv' | 'excel') => {
    setIsDownloadingPreset(true)
    try {
      // Always include all variables for preset downloads
      const allVarNames = COST_VARIABLES.map(v => v.name)
      
      // Create header row with all variables
      const headerRow = ["Year", "Country", ...allVarNames, "Total Cost"].join(",")
      
      // Create sample data rows (2025-2050)
      const dataRows = []
      for (let year = 2025; year <= 2050; year++) {
        const rowValues = [year, COUNTRY_NAMES[selectedCountry]]
        
        // Add values for all variables
        let totalCost = 0
        for (const variable of COST_VARIABLES) {
          // Generate a random value between 0.1 and 2.0 for demonstration
          const value = (Math.random() * 1.9 + 0.1).toFixed(2)
          rowValues.push(value)
          totalCost += parseFloat(value)
        }
        
        // Add total cost
        rowValues.push(totalCost.toFixed(2))
        dataRows.push(rowValues.join(","))
      }
      
      // Combine header and data rows
      const csvContent = [headerRow, ...dataRows].join("\n")

      // Create a blob and download it
      const blob = new Blob([csvContent], { type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `stacked_cost_data_${selectedCountry}_all_variables.${format === 'csv' ? 'csv' : 'xlsx'}`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading file:", error)
      // Handle error here
    } finally {
      setIsDownloadingPreset(false)
    }
  }

  // Show loading state while checking authentication
  if (isLoading || !authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  // Only render the download UI if authenticated
  if (!isAuthenticated) {
    return null // Return null as we're redirecting in the useEffect
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      {/* Breadcrumb navigation */}
      <div className="flex items-center mb-6">
        <Link 
          href="/dashboard" 
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-8">Download Stacked Cost Data</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Select Data Parameters</CardTitle>
          <CardDescription>Choose the country and cost variables for the data you want to download</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-full md:w-[300px]">
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Cost Variables</label>
              <div className="flex flex-wrap gap-4 mt-2">
                {COST_VARIABLES.map((variable) => (
                  <div key={variable.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`variable-${variable.id}`}
                      checked={selectedVariables.includes(variable.id)}
                      onCheckedChange={() => toggleVariable(variable.id)}
                    />
                    <Label htmlFor={`variable-${variable.id}`} className="text-sm flex items-center">
                      <div className="w-3 h-3 mr-1 rounded-sm" style={{ backgroundColor: variable.color }} />
                      {variable.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-8">
            <Button 
              onClick={handleDownload} 
              className="w-full md:w-auto"
              disabled={isDownloading || selectedVariables.length === 0}
            >
              {isDownloading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Custom Selection (CSV)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Available Data Files</CardTitle>
          <CardDescription>Sample files available for download</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Stacked Cost Data - {COUNTRY_NAMES[selectedCountry]} (All Variables)</h3>
                <p className="text-sm text-muted-foreground">CSV, 18KB</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleDownloadPreset('csv')}
                disabled={isDownloadingPreset}
              >
                {isDownloadingPreset ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Stacked Cost Data - {COUNTRY_NAMES[selectedCountry]} (Excel Format)</h3>
                <p className="text-sm text-muted-foreground">Excel, 22KB</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleDownloadPreset('excel')}
                disabled={isDownloadingPreset}
              >
                {isDownloadingPreset ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Return to Dashboard button at the bottom center */}
      <div className="flex justify-center mt-8">
        <Link href="/dashboard">
          <Button variant="outline" className="w-auto">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
} 