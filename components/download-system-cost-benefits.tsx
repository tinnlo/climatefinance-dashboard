"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useSearchParamsContext } from "@/app/components/SearchParamsProvider"

// Country names mapping for display and CSV
const COUNTRY_MAP: { [key: string]: string } = {
  'EGY': 'Egypt',
  'IDN': 'Indonesia',
  'IND': 'India',
  'IRN': 'Iran',
  'KEN': 'Kenya',
  'MEX': 'Mexico',
  'NGA': 'Nigeria',
  'THA': 'Thailand',
  'TZA': 'Tanzania',
  'UGA': 'Uganda',
  'VNM': 'Vietnam',
  'ZAF': 'South Africa'
};

export function DownloadSystemCostBenefits() {
  const searchParams = useSearchParamsContext()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  
  // Force the country code to be uppercase for consistency
  const initialCountry = searchParams?.get("country") || "IND"
  const [selectedCountry, setSelectedCountry] = useState(initialCountry.toUpperCase())
  const [selectedSCC, setSelectedSCC] = useState(searchParams?.get("scc") || "80")
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState(searchParams?.get("timeHorizon") || "2035")
  const [isDownloading, setIsDownloading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // Check if UI is initialized and country is selected
  const [uiReady, setUiReady] = useState(false)
  
  useEffect(() => {
    // Log the current state
    console.log('Country state:', {
      initialCountry,
      selectedCountry,
      uiReady
    })
    
    // Mark UI as ready to ensure country displays properly
    if (!uiReady) {
      setUiReady(true)
    }
  }, [initialCountry, selectedCountry, uiReady])

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

  // SCC options for the dropdown
  const sccOptions = [
    { value: "80", label: "SCC 80 USD" },
    { value: "190", label: "SCC 190 USD" },
    { value: "1056", label: "SCC 1056 USD" },
  ]

  // Time horizons for the dropdown
  const timeHorizons = [
    { value: "2035", label: "Until 2035" },
    { value: "2050", label: "Until 2050" },
  ]

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      // Fetch the data from our API
      const response = await fetch(`/api/system-cost-benefits?country=${selectedCountry}&scc=${selectedSCC}&timeHorizon=${selectedTimeHorizon}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      // Get country name for display
      const countryName = COUNTRY_MAP[selectedCountry] || selectedCountry;
      
      // Create CSV content from the fetched data
      const csvContent = `Country,SCC,TimeHorizon,Category,Value
${countryName},${selectedSCC},${selectedTimeHorizon},Private Funding,${data.costs[0].value.toFixed(4)}
${countryName},${selectedSCC},${selectedTimeHorizon},Public Funding,${data.costs[1].value.toFixed(4)}
${countryName},${selectedSCC},${selectedTimeHorizon},International Climate Finance Needs,${data.costs[2].value.toFixed(4)}
${countryName},${selectedSCC},${selectedTimeHorizon},Total Cost,${data.totalCost.toFixed(4)}
${countryName},${selectedSCC},${selectedTimeHorizon},Benefits from Air Pollution,${data.airPollutionBenefit.toFixed(4)}
${countryName},${selectedSCC},${selectedTimeHorizon},Benefits to the Country,${data.countryBenefit.toFixed(4)}
${countryName},${selectedSCC},${selectedTimeHorizon},Benefits to the Rest of the World,${data.worldBenefit.toFixed(4)}
${countryName},${selectedSCC},${selectedTimeHorizon},Total Benefit,${data.totalBenefit.toFixed(4)}`;

      // Create a blob and download it
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `system_cost_benefits_${selectedCountry}_scc${selectedSCC}_${selectedTimeHorizon}.csv`);
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
    return null; // Return null as we're redirecting in the useEffect
  }

  return (
    <div className="min-h-screen bg-[#1A2A1A]">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Breadcrumb navigation */}
        <div className="flex items-center mb-6">
          <Link 
            href="/dashboard" 
            className="flex items-center text-white hover:text-blue-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-8 text-white">Download System Cost and Benefits Data</h1>
        
        <Card className="mb-8 bg-[#2A3A2A] border-[#4A5A4A]">
          <CardHeader>
            <CardTitle>Select Data Parameters</CardTitle>
            <CardDescription>Choose the country, social cost of carbon, and time horizon for the data you want to download</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Select 
                  value={selectedCountry}
                  onValueChange={(value) => setSelectedCountry(value.toUpperCase())}
                >
                  <SelectTrigger className="bg-[#3A4A3A] border-[#4A5A4A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A3A2A] border-[#4A5A4A]">
                    <SelectItem value="IND">India</SelectItem>
                    <SelectItem value="IDN">Indonesia</SelectItem>
                    <SelectItem value="ZAF">South Africa</SelectItem>
                    <SelectItem value="VNM">Vietnam</SelectItem>
                    <SelectItem value="IRN">Iran</SelectItem>
                    <SelectItem value="MEX">Mexico</SelectItem>
                    <SelectItem value="NGA">Nigeria</SelectItem>
                    <SelectItem value="EGY">Egypt</SelectItem>
                    <SelectItem value="KEN">Kenya</SelectItem>
                    <SelectItem value="TZA">Tanzania</SelectItem>
                    <SelectItem value="THA">Thailand</SelectItem>
                    <SelectItem value="UGA">Uganda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Social Cost of Carbon</label>
                <Select value={selectedSCC} onValueChange={setSelectedSCC}>
                  <SelectTrigger className="bg-[#3A4A3A] border-[#4A5A4A]">
                    <SelectValue placeholder="Select SCC" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A3A2A] border-[#4A5A4A]">
                    {sccOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Time Horizon</label>
                <Select value={selectedTimeHorizon} onValueChange={setSelectedTimeHorizon}>
                  <SelectTrigger className="bg-[#3A4A3A] border-[#4A5A4A]">
                    <SelectValue placeholder="Select time horizon" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A3A2A] border-[#4A5A4A]">
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
                variant="outline"
                className="w-full md:w-auto border-[#4A5A4A] hover:bg-[#4A5A4A] text-white"
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
        
        <Card className="mb-8 bg-[#2A3A2A] border-[#4A5A4A]">
          <CardHeader>
            <CardTitle>Data Content Description</CardTitle>
            <CardDescription>What's included in the downloaded file</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border rounded-lg divide-y border-[#4A5A4A] bg-[#3A4A3A]">
                <div className="p-4">
                  <h3 className="font-medium mb-2 text-white">System Costs</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Private Funding</li>
                    <li>Public Funding</li>
                    <li>International Climate Finance Needs</li>
                  </ul>
                </div>
                
                <div className="p-4 border-t border-[#4A5A4A]">
                  <h3 className="font-medium mb-2 text-white">System Benefits</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Benefits from Air Pollution</li>
                    <li>Benefits to the Country (based on selected SCC)</li>
                    <li>Benefits to the Rest of the World (based on selected SCC)</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Return to Dashboard button at the bottom center */}
        <div className="flex justify-center mt-8">
          <Link href="/dashboard">
            <Button variant="outline" className="w-auto border-[#4A5A4A] hover:bg-[#4A5A4A] text-white">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 