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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { convertToIso3 } from "@/lib/utils"

// Import the cost variables from the stacked-cost-chart component
const COST_VARIABLES = [
  // Warm tones from the "costs" palette (oranges/reds)
  { id: "cost_battery_grid", name: "Grid Battery", color: "#e65c1a" },
  { id: "cost_battery_long", name: "Long-term Battery", color: "#ff7c43" },
  { id: "cost_battery_pe", name: "PE Battery", color: "#ff9e6d" },
  { id: "cost_battery_short", name: "Short-term Battery", color: "#ffbd59" },
  { id: "opportunity_cost", name: "Opportunity", color: "#ffd29c" },
  
  // Worker-related costs using climate finance colors
  { id: "worker_compensation_cost", name: "Worker Compensation", color: "#b3de69" },
  { id: "worker_retraining_cost", name: "Worker Retraining", color: "#d4e79e" },
  
  // Cool tones from the "benefits" palette (blues)
  { id: "solar_cost", name: "Solar", color: "#80d3e8" },
  { id: "wind_offshore_cost", name: "Wind Offshore", color: "#48cae4" },
  { id: "wind_onshore_cost", name: "Wind Onshore", color: "#00b4d8" },
  { id: "geothermal_cost", name: "Geothermal", color: "#0096c7" },
  { id: "hydropower_cost", name: "Hydropower", color: "#0077b6" },
]

// Define an interface for the year data
interface YearData {
  year: string;
  [key: string]: any; // This allows for any property names
}

interface DownloadStackedCostProps {
  country: string;
}

export function DownloadStackedCost({ country }: DownloadStackedCostProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [selectedCountry, setSelectedCountry] = useState(country)
  const [selectedVariables, setSelectedVariables] = useState<string[]>(COST_VARIABLES.map(v => v.id))
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDownloadingPreset, setIsDownloadingPreset] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [gdpValue, setGdpValue] = useState<number>(1.0) // Default GDP value

  // Fetch GDP data when country changes
  useEffect(() => {
    const fetchGdpData = async () => {
      try {
        const iso3Code = convertToIso3(selectedCountry)
        console.log(`Fetching GDP data for country code: ${selectedCountry} (ISO3: ${iso3Code})`)
        const response = await fetch('/api/country-info')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const allCountryData = await response.json()
        
        if (!Array.isArray(allCountryData)) {
          console.error('Unexpected data format:', allCountryData)
          throw new Error('Received invalid data format from API')
        }
        
        const countryData = allCountryData.find((c: any) => c.Country_ISO3 === iso3Code)
        
        if (countryData && countryData.GDP_2023) {
          // Convert GDP from dollars to trillions
          const gdpInTrillions = countryData.GDP_2023 / 1000000000000
          console.log(`GDP for ${countryData.Country} (${iso3Code}): $${gdpInTrillions.toFixed(2)}T`)
          setGdpValue(gdpInTrillions)
        } else {
          console.warn(`No GDP data found for ${selectedCountry}, using default value`)
          setGdpValue(1.0)
        }
      } catch (error) {
        console.error('Error fetching GDP data:', error)
        // Use default GDP value if there's an error
        setGdpValue(1.0)
      }
    }
    
    fetchGdpData()
  }, [selectedCountry])

  // Check authentication status
  useEffect(() => {
    if (!isLoading) {
      setAuthChecked(true)
      if (!isAuthenticated) {
        router.push(`/login?returnTo=/downloads/stacked-data?type=cost&country=${country}`)
      }
    }
  }, [isAuthenticated, isLoading, router, country])

  const toggleVariable = (variableId: string) => {
    setSelectedVariables((prev) =>
      prev.includes(variableId) ? prev.filter((id) => id !== variableId) : [...prev, variableId]
    )
  }

  // Function to download custom data with selected variables
  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      // Fetch real data from the API
      const response = await fetch(`/api/cost-variables?country=${selectedCountry}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      // Create header row with selected variables
      const selectedVarNames = COST_VARIABLES
        .filter(v => selectedVariables.includes(v.id))
        .map(v => v.name)
      
      const headerRow = ["Year", "Country", ...selectedVarNames, "Total Cost", "GDP Percentage"].join(",")
      
      // Create data rows from the API response
      const dataRows = result.data.map((yearData: YearData) => {
        const rowValues = [yearData.year, COUNTRY_NAMES[selectedCountry]]
        
        // Add values for each selected variable
        let totalCost = 0
        for (const variable of COST_VARIABLES) {
          if (selectedVariables.includes(variable.id)) {
            const value = yearData[variable.id] || 0
            rowValues.push(value.toFixed(4))
            totalCost += value
          }
        }
        
        // Add total cost and GDP percentage
        rowValues.push(totalCost.toFixed(4))
        
        // Calculate GDP percentage using the actual GDP value
        const gdpPercentage = (totalCost / gdpValue) * 100
        rowValues.push(gdpPercentage.toFixed(2))
        
        return rowValues.join(",")
      })
      
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
      // Fetch real data from the API
      const response = await fetch(`/api/cost-variables?country=${selectedCountry}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      // Always include all variables for preset downloads
      const allVarNames = COST_VARIABLES.map(v => v.name)
      
      // Create header row with all variables
      const headerRow = ["Year", "Country", ...allVarNames, "Total Cost", "GDP Percentage"].join(",")
      
      // Create data rows from the API response
      const dataRows = result.data.map((yearData: YearData) => {
        const rowValues = [yearData.year, COUNTRY_NAMES[selectedCountry]]
        
        // Add values for all variables
        let totalCost = 0
        for (const variable of COST_VARIABLES) {
          const value = yearData[variable.id] || 0
          rowValues.push(value.toFixed(4))
          totalCost += value
        }
        
        // Add total cost and GDP percentage
        rowValues.push(totalCost.toFixed(4))
        
        // Calculate GDP percentage using the actual GDP value
        const gdpPercentage = (totalCost / gdpValue) * 100
        rowValues.push(gdpPercentage.toFixed(2))
        
        return rowValues.join(",")
      })
      
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div>
      <Card className="mb-8 bg-[#2A3A2A] border-[#4A5A4A]">
        <CardHeader>
          <CardTitle>Select Data Parameters</CardTitle>
          <CardDescription>Choose the country and cost variables for the data you want to download</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-full md:w-[300px] bg-[#3A4A3A] border-[#4A5A4A]">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="bg-[#2A3A2A] border-[#4A5A4A]">
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
                      className="bg-[#3A4A3A] border-[#4A5A4A]"
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
              variant="outline"
              className="w-full md:w-auto border-[#4A5A4A] hover:bg-[#4A5A4A] text-white"
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
      
      <Card className="mb-8 bg-[#2A3A2A] border-[#4A5A4A]">
        <CardHeader>
          <CardTitle>Available Data Files</CardTitle>
          <CardDescription>Sample files available for download</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg border-[#4A5A4A] bg-[#3A4A3A]">
              <div>
                <h3 className="font-medium">Stacked Cost Data - {COUNTRY_NAMES[selectedCountry]} (All Variables)</h3>
                <p className="text-sm text-muted-foreground">CSV, 18KB</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleDownloadPreset('csv')}
                disabled={isDownloadingPreset}
                className="border-[#4A5A4A] hover:bg-[#4A5A4A]"
              >
                {isDownloadingPreset ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg border-[#4A5A4A] bg-[#3A4A3A]">
              <div>
                <h3 className="font-medium">Stacked Cost Data - {COUNTRY_NAMES[selectedCountry]} (Excel Format)</h3>
                <p className="text-sm text-muted-foreground">Excel, 22KB</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleDownloadPreset('excel')}
                disabled={isDownloadingPreset}
                className="border-[#4A5A4A] hover:bg-[#4A5A4A]"
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
    </div>
  )
} 