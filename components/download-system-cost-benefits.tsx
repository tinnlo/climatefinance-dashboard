"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { COUNTRY_NAMES } from "@/lib/constants"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, ChevronRight, ArrowLeft } from "lucide-react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

export function DownloadSystemCostBenefits() {
  const searchParams = useSearchParams()
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get("country") || "in")
  const [selectedScenario, setSelectedScenario] = useState(searchParams.get("scenario") || "baseline")
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState(searchParams.get("timeHorizon") || "2025")
  const [isDownloading, setIsDownloading] = useState(false)

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

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      // For testing, we'll create a sample CSV file
      const csvContent = `Country,Scenario,TimeHorizon,Category,Value,GDPPercentage
${COUNTRY_NAMES[selectedCountry]},${selectedScenario},${selectedTimeHorizon},TotalCost,3.5,2.1
${COUNTRY_NAMES[selectedCountry]},${selectedScenario},${selectedTimeHorizon},CapitalInvestment,1.8,1.1
${COUNTRY_NAMES[selectedCountry]},${selectedScenario},${selectedTimeHorizon},OperatingCosts,1.2,0.7
${COUNTRY_NAMES[selectedCountry]},${selectedScenario},${selectedTimeHorizon},MaintenanceCosts,0.5,0.3
${COUNTRY_NAMES[selectedCountry]},${selectedScenario},${selectedTimeHorizon},TotalBenefit,8.2,4.9
${COUNTRY_NAMES[selectedCountry]},${selectedScenario},${selectedTimeHorizon},AvoidedClimateImpacts,5.1,3.1
${COUNTRY_NAMES[selectedCountry]},${selectedScenario},${selectedTimeHorizon},HealthBenefits,3.1,1.8`;

      // Create a blob and download it
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `system_cost_benefits_${selectedCountry}_${selectedScenario}_${selectedTimeHorizon}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      // Handle error here
    } finally {
      setIsDownloading(false);
    }
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
      
      <h1 className="text-3xl font-bold mb-8">Download System Cost and Benefits Data</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Select Data Parameters</CardTitle>
          <CardDescription>Choose the country, scenario, and time horizon for the data you want to download</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Scenario</label>
              <Select value={selectedScenario} onValueChange={setSelectedScenario}>
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Horizon</label>
              <Select value={selectedTimeHorizon} onValueChange={setSelectedTimeHorizon}>
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
          
          <div className="flex justify-center mt-8">
            <Button 
              onClick={handleDownload} 
              className="w-full md:w-auto"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Data (CSV)
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
                <h3 className="font-medium">System Cost Benefits - {COUNTRY_NAMES[selectedCountry]} (Baseline)</h3>
                <p className="text-sm text-muted-foreground">CSV, 24KB</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">System Cost Benefits - Full Dataset</h3>
                <p className="text-sm text-muted-foreground">Excel, 156KB</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
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