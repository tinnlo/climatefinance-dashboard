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

// Color palette for benefit variables
const BENEFIT_VARIABLES = [
  // Warm tones for fossil fuel benefits
  { id: "coal_benefit", name: "Coal", color: "#ff7c43" },
  { id: "gas_benefit", name: "Gas", color: "#ffa600" },
  { id: "oil_benefit", name: "Oil", color: "#ffd29c" },
  // Cool tone for environmental benefit
  { id: "reduced_air_pollution", name: "Reduced Air Pollution", color: "#00b4d8" }
]

// Define an interface for the year data
interface YearData {
  year: string;
  [key: string]: any; // This allows for any property names
}

interface DownloadStackedBenefitProps {
  country: string;
}

export function DownloadStackedBenefit({ country }: DownloadStackedBenefitProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [selectedCountry, setSelectedCountry] = useState(country)
  const [selectedVariables, setSelectedVariables] = useState<string[]>([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDownloadingPreset, setIsDownloadingPreset] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [gdpValue, setGdpValue] = useState<number>(1.0)
  const [availableVariables, setAvailableVariables] = useState<string[]>([])

  // Initialize available variables and fetch GDP data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Initialize with all benefit variables
        setAvailableVariables(BENEFIT_VARIABLES.map(v => v.id))
        setSelectedVariables(BENEFIT_VARIABLES.map(v => v.id))

        // Fetch GDP data
        const iso3Code = convertToIso3(selectedCountry)
        const gdpResponse = await fetch('/api/country-info')
        if (!gdpResponse.ok) {
          throw new Error('Failed to fetch GDP data')
        }
        const allCountryData = await gdpResponse.json()
        const countryData = allCountryData.find((c: any) => c.Country_ISO3 === iso3Code)
        
        if (countryData && countryData.GDP_2023) {
          const gdpInTrillions = countryData.GDP_2023 / 1000000000000
          setGdpValue(gdpInTrillions)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        // Set default values if fetch fails
        setAvailableVariables(BENEFIT_VARIABLES.map(v => v.id))
        setSelectedVariables(BENEFIT_VARIABLES.map(v => v.id))
        setGdpValue(1.0)
      }
    }
    
    fetchData()
  }, [selectedCountry])

  // Check authentication status
  useEffect(() => {
    if (!isLoading) {
      setAuthChecked(true)
      if (!isAuthenticated) {
        router.push(`/login?returnTo=/downloads/stacked-data?type=benefit&country=${country}`)
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
      const response = await fetch(`/api/benefit-variables?country=${selectedCountry}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      // Create header row with selected variables
      const selectedVarNames = BENEFIT_VARIABLES
        .filter(v => selectedVariables.includes(v.id))
        .map(v => v.name)
      
      const headerRow = ["Year", "Country", ...selectedVarNames, "Total Benefit", "GDP Percentage"].join(",")
      
      // Create data rows
      const dataRows = result.data.map((yearData: YearData) => {
        const rowValues = [yearData.year, COUNTRY_NAMES[selectedCountry]]
        
        // Add values for each selected variable
        let totalBenefit = 0
        for (const variable of BENEFIT_VARIABLES) {
          if (selectedVariables.includes(variable.id)) {
            const value = yearData[variable.id] || 0
            rowValues.push(value.toFixed(4))
            totalBenefit += value
          }
        }
        
        // Add total benefit and GDP percentage
        rowValues.push(totalBenefit.toFixed(4))
        const gdpPercentage = (totalBenefit / gdpValue) * 100
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
      link.setAttribute("download", `stacked_benefit_data_${selectedCountry}_custom.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading file:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  // Function to download preset data with all available variables
  const handleDownloadPreset = async (format: 'csv' | 'excel') => {
    setIsDownloadingPreset(true)
    try {
      const response = await fetch(`/api/benefit-variables?country=${selectedCountry}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      // Use only available variables for preset downloads
      const availableVarNames = BENEFIT_VARIABLES
        .filter(v => availableVariables.includes(v.id))
        .map(v => v.name)
      
      const headerRow = ["Year", "Country", ...availableVarNames, "Total Benefit", "GDP Percentage"].join(",")
      
      const dataRows = result.data.map((yearData: YearData) => {
        const rowValues = [yearData.year, COUNTRY_NAMES[selectedCountry]]
        
        let totalBenefit = 0
        for (const variable of BENEFIT_VARIABLES) {
          if (availableVariables.includes(variable.id)) {
            const value = yearData[variable.id] || 0
            rowValues.push(value.toFixed(4))
            totalBenefit += value
          }
        }
        
        rowValues.push(totalBenefit.toFixed(4))
        const gdpPercentage = (totalBenefit / gdpValue) * 100
        rowValues.push(gdpPercentage.toFixed(2))
        
        return rowValues.join(",")
      })
      
      const csvContent = [headerRow, ...dataRows].join("\n")

      const blob = new Blob([csvContent], { type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `stacked_benefit_data_${selectedCountry}_all_variables.${format === 'csv' ? 'csv' : 'xlsx'}`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading file:", error)
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
          <CardDescription>Choose the country and benefit variables for the data you want to download</CardDescription>
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
              <label className="text-sm font-medium">Benefit Variables</label>
              <div className="flex flex-wrap gap-4 mt-2">
                {BENEFIT_VARIABLES.filter(variable => availableVariables.includes(variable.id)).map((variable) => (
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
                <h3 className="font-medium">Stacked Benefit Data - {COUNTRY_NAMES[selectedCountry]} (All Variables)</h3>
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
                <h3 className="font-medium">Stacked Benefit Data - {COUNTRY_NAMES[selectedCountry]} (Excel Format)</h3>
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