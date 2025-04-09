"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { COUNTRY_NAMES } from "@/lib/constants"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

// Define the phase-in variables as defined in the API
const PHASE_IN_VARIABLES = [
  // Renewable technologies - blues to greens
  { id: "solar", name: "Solar", color: "#82ca9d" },
  { id: "onshore_wind", name: "Onshore Wind", color: "#4caf50" },
  { id: "offshore_wind", name: "Offshore Wind", color: "#00b4d8" },
  { id: "hydropower", name: "Hydropower", color: "#0077b6" },
  { id: "geothermal", name: "Geothermal", color: "#0096c7" },
  
  // Storage technologies - oranges to yellows
  { id: "battery_short", name: "Short-term Battery", color: "#ffbd59" },
  { id: "battery_long", name: "Long-term Battery", color: "#ff7c43" },
];

// Group variables into categories for display
const PHASE_IN_CATEGORIES = [
  {
    name: "Renewable Technologies",
    variables: [
      { id: "solar", name: "Solar", color: "#82ca9d" },
      { id: "onshore_wind", name: "Onshore Wind", color: "#4caf50" },
      { id: "offshore_wind", name: "Offshore Wind", color: "#00b4d8" },
      { id: "hydropower", name: "Hydropower", color: "#0077b6" },
      { id: "geothermal", name: "Geothermal", color: "#0096c7" },
    ]
  },
  {
    name: "Storage Technologies",
    variables: [
      { id: "battery_short", name: "Short-term Battery", color: "#ffbd59" },
      { id: "battery_long", name: "Long-term Battery", color: "#ff7c43" },
    ]
  }
];

// Define an interface for the year data
interface YearData {
  year: string;
  [key: string]: any; // This allows for any property names
}

interface DownloadPhaseInProps {
  country: string;
}

export function DownloadPhaseIn({ country }: DownloadPhaseInProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [selectedCountry, setSelectedCountry] = useState(country)
  const [selectedVariables, setSelectedVariables] = useState<string[]>(PHASE_IN_VARIABLES.map(v => v.id))
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDownloadingPreset, setIsDownloadingPreset] = useState(false)
  
  // Check authentication status
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnPath = `/downloads/phase-in-data?country=${country}`;
      router.push(`/login?returnTo=${encodeURIComponent(returnPath)}`);
    }
  }, [isAuthenticated, isLoading, router, country])

  // If still loading auth state, show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // If not authenticated, show nothing (will be redirected)
  if (!isAuthenticated) {
    return null
  }

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
      const response = await fetch(`/api/phase-in-data?country=${selectedCountry}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      // Create header row with selected variables
      const selectedVarNames = PHASE_IN_VARIABLES
        .filter(v => selectedVariables.includes(v.id))
        .map(v => v.name)
      
      const headerRow = ["Year", "Country", ...selectedVarNames, "Total Capacity (GW)"].join(",")
      
      // Create data rows from the API response
      const dataRows = result.data.map((yearData: YearData) => {
        const rowValues = [yearData.year, COUNTRY_NAMES[selectedCountry]]
        
        // Add values for each selected variable
        let totalCapacity = 0
        for (const variable of PHASE_IN_VARIABLES) {
          if (selectedVariables.includes(variable.id)) {
            const value = yearData[variable.id] || 0
            rowValues.push(value.toFixed(4))
            totalCapacity += value
          }
        }
        
        // Add total capacity
        rowValues.push(totalCapacity.toFixed(4))
        
        return rowValues.join(",")
      })
      
      // Combine header and data rows
      const csvContent = [headerRow, ...dataRows].join("\n")

      // Create a blob and download it
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `phase_in_data_${selectedCountry}_custom.csv`)
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
  const handleDownloadPreset = async (format: 'csv' | 'json') => {
    setIsDownloadingPreset(true)
    try {
      // Fetch real data from the API
      const response = await fetch(`/api/phase-in-data?country=${selectedCountry}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      if (format === 'json') {
        // Create JSON blob
        const jsonContent = JSON.stringify({
          country: COUNTRY_NAMES[selectedCountry],
          variables: PHASE_IN_VARIABLES,
          data: result.data
        }, null, 2)
        
        const blob = new Blob([jsonContent], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `phase_in_data_${selectedCountry}_all_variables.json`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        // Create CSV
        const allVarNames = PHASE_IN_VARIABLES.map(v => v.name)
        
        // Create header row with all variables
        const headerRow = ["Year", "Country", ...allVarNames, "Total Capacity (GW)"].join(",")
        
        // Create data rows from the API response
        const dataRows = result.data.map((yearData: YearData) => {
          const rowValues = [yearData.year, COUNTRY_NAMES[selectedCountry]]
          
          // Add values for all variables
          let totalCapacity = 0
          for (const variable of PHASE_IN_VARIABLES) {
            const value = yearData[variable.id] || 0
            rowValues.push(value.toFixed(4))
            totalCapacity += value
          }
          
          // Add total capacity
          rowValues.push(totalCapacity.toFixed(4))
          
          return rowValues.join(",")
        })
        
        // Combine header and data rows
        const csvContent = [headerRow, ...dataRows].join("\n")

        // Create a blob and download it
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `phase_in_data_${selectedCountry}_all_variables.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error("Error downloading file:", error)
      // Handle error here
    } finally {
      setIsDownloadingPreset(false)
    }
  }

  return (
    <div>
      <Card className="mb-8 bg-[#2A3A2A] border-[#4A5A4A]">
        <CardHeader>
          <CardTitle>Select Data Parameters</CardTitle>
          <CardDescription>Choose the country and capacity variables for the data you want to download</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
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
              <label className="text-sm font-medium">Capacity Variables</label>
              
              {PHASE_IN_CATEGORIES.map((category, categoryIndex) => (
                <div key={`category-${categoryIndex}`} className="mt-4">
                  <h3 className="text-sm font-medium mb-2">{category.name}</h3>
                  <div className="flex flex-wrap gap-4 ml-4">
                    {category.variables.map((variable) => (
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
              ))}
            </div>
          </div>
          
          <div className="flex flex-col items-center mt-8">
            <div className="bg-[#3A4A3A] px-4 py-2 rounded-md mb-4 w-full md:w-auto text-center">
              <span className="font-medium">Current selection: </span>
              <span className="text-white font-bold">{COUNTRY_NAMES[selectedCountry]}</span>
            </div>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Available Data Files</CardTitle>
          </div>
          <div className="bg-[#3A4A3A] px-3 py-1 rounded-md hidden md:block">
            <span className="text-sm font-medium">Country: </span>
            <span className="text-sm text-white font-bold">{COUNTRY_NAMES[selectedCountry]}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg border-[#4A5A4A] bg-[#3A4A3A]">
              <div>
                <h3 className="font-medium">Phase-In Capacity Data - All Variables</h3>
                <p className="text-sm text-muted-foreground">CSV, 15KB</p>
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
                <h3 className="font-medium">Phase-In Capacity Data - JSON Format</h3>
                <p className="text-sm text-muted-foreground">JSON, 20KB</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleDownloadPreset('json')}
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