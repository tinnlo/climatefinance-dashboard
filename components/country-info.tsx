"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { convertToIso3 } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Info, ChevronDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

const COUNTRY_PROFILE_DESCRIPTION = `The country profile infobox displays comprehensive information about each country's emissions and climate commitments using data from several authoritative sources:

1. The emissions data comes from the Emissions Database for Global Atmospheric Research (EDGAR), which provides current greenhouse gas emissions and tracks year-over-year changes. 

2. Climate target information is sourced from the Net Zero Tracker, showing each country's emission reduction goals and their implementation status. 

3. The Nationally Determined Contributions (NDC) Tracker from ClimateWatch provides details about countries' formal commitments under the Paris Agreement. 

4. Economic context is added through GDP data, showing each country's economic scale and its share of the global economy. 

Together, these data sources give users a complete snapshot of each country's current emissions, climate ambitions, and economic context, helping them understand both the challenges and opportunities in addressing climate change.`

interface CountryData {
  Country_ISO3: string
  Country: string
  Region: string
  Population: number
  Population_Share: number
  GDP_2023: number
  GDP_Share_2023: number
  Emission_2023: number
  Emissions_Share_2023: number
  Emissions_Change_2023: number
  End_target_percentage_reduction?: number
  End_target_baseline_year?: number
  End_target_year?: number
  Status_of_end_target?: string
  Date_of_last_status_update?: number
  End_target_text?: string
  NDC_2020_status?: string
  NDC_2020_statement?: string
  NDC_2020_source?: string
  NDC_2025_status?: string
  NDC_2025_statement?: string
  NDC_2025_source?: string
  Sectors?: string[]
  Sector?: string
  Asset_Amount?: number
  Asset_Amount_operating?: number
  Asset_Amount_planned?: number
  Capacity_operating?: number
  Emissions_operating?: number
  Capacity_planned?: number
  Emissions_planned?: number
}

export function CountryInfo({ country = "in", className }: { country?: string; className?: string }) {
  const [data, setData] = useState<CountryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSector, setSelectedSector] = useState<string>("all")

  useEffect(() => {
    const fetchCountryData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/country-info?country=${country}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const countryData = await response.json()
        setData(countryData)
      } catch (error) {
        console.error('Error fetching country data:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch country data')
      } finally {
        setLoading(false)
      }
    }

    fetchCountryData()
  }, [country])

  const getCoverageData = () => {
    if (!data) {
      return {
        Asset_Amount_operating: undefined,
        Asset_Amount_planned: undefined,
        Capacity_operating: undefined,
        Emissions_operating: undefined,
        Capacity_planned: undefined,
        Emissions_planned: undefined
      }
    }

    // For now, we return the data directly since sector handling is simplified
    return {
      Asset_Amount_operating: data.Asset_Amount_operating,
      Asset_Amount_planned: data.Asset_Amount_planned,
      Capacity_operating: data.Capacity_operating,
      Emissions_operating: data.Emissions_operating,
      Capacity_planned: data.Capacity_planned,
      Emissions_planned: data.Emissions_planned
    }
  }

  const coverageData = getCoverageData()

  if (loading) {
    return (
      <Card className={cn("dark:bg-[#2F3A2F]", className)}>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p>Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("dark:bg-[#2F3A2F]", className)}>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className={cn("dark:bg-[#2F3A2F]", className)}>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p>No data available for country code: {country}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("dark:bg-[#2F3A2F]", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-4xl font-semibold">{data.Country.toUpperCase()}</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="h-4 w-4" />
                <span className="sr-only">Country Profile Information</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>About Country Profile Data</DialogTitle>
              </DialogHeader>
              <DialogDescription className="text-sm leading-relaxed whitespace-pre-line">
                {COUNTRY_PROFILE_DESCRIPTION}
              </DialogDescription>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex justify-between items-center mt-2">
          <div className="flex gap-2">
            <Badge variant="outline">{data.Country_ISO3}</Badge>
            <Badge variant="secondary">{data.Region}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4">
          {/* Key Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Population</p>
              <p className="text-xl font-medium">
                {data.Population ? `${(data.Population / 1000000).toFixed(2)}M` : 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {typeof data.Population_Share === 'number' ? `${data.Population_Share.toFixed(2)}% of global population` : 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">GDP (2023)</p>
              <p className="text-xl font-medium">
                ${data.GDP_2023 ? `${(data.GDP_2023 / 1000000000).toFixed(2)}B` : 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {typeof data.GDP_Share_2023 === 'number' ? `${data.GDP_Share_2023.toFixed(2)}% of global GDP` : 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Emissions (2023)</p>
              <p className="text-xl font-medium">
                {data.Emission_2023.toFixed(2)} MtCO₂e
              </p>
              <p className="text-sm text-muted-foreground">
                {data.Emissions_Share_2023.toFixed(2)}% of global emissions
              </p>
              <p className="text-sm" style={{ color: data.Emissions_Change_2023 > 0 ? '#ef4444' : '#22c55e' }}>
                ({data.Emissions_Change_2023 > 0 ? '+' : ''}{data.Emissions_Change_2023.toFixed(1)}% from 2022)
              </p>
            </div>
          </div>

          {/* NDC Target Section */}
          {data.End_target_percentage_reduction && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <p className="text-lg font-medium">NDC Target:</p>
                <Badge variant="outline">{data.Status_of_end_target}</Badge>
                {data.Date_of_last_status_update && (
                  <Badge variant="secondary">Updated: {data.Date_of_last_status_update}</Badge>
                )}
              </div>
              <p className="text-xl">
                {data.End_target_percentage_reduction}% by {data.End_target_year}
                {data.End_target_baseline_year && (
                  <span className="text-sm ml-2">
                    (from {data.End_target_baseline_year} baseline)
                  </span>
                )}
              </p>
              {data.End_target_text && (
                <p className="text-sm text-muted-foreground mt-2 break-words whitespace-pre-wrap">
                  {data.End_target_text}
                </p>
              )}
            </div>
          )}

          {/* Coverage Information Section */}
          {(coverageData?.Asset_Amount_operating || coverageData?.Asset_Amount_planned || coverageData?.Capacity_operating || coverageData?.Emissions_operating || coverageData?.Capacity_planned || coverageData?.Emissions_planned) && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <p className="text-lg font-medium">Coverage Information</p>
                {data.Sectors && data.Sectors.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        Sector: {selectedSector === "all" ? "All Sectors" : selectedSector}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuRadioGroup value={selectedSector} onValueChange={setSelectedSector}>
                        <DropdownMenuRadioItem value="all">All Sectors</DropdownMenuRadioItem>
                        <DropdownMenuSeparator />
                        {data.Sectors.map((sector) => (
                          <DropdownMenuRadioItem key={sector} value={sector}>
                            {sector}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Asset, Capacity, and Emissions Coverage in one row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(coverageData?.Asset_Amount_operating !== undefined || coverageData?.Asset_Amount_planned !== undefined) && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Asset Coverage</p>
                    <p className="text-xl font-medium">
                      {((coverageData.Asset_Amount_operating || 0) + (coverageData.Asset_Amount_planned || 0)).toLocaleString()} assets
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {coverageData.Asset_Amount_operating?.toLocaleString() || '0'} operating
                      {"\n"}
                      {coverageData.Asset_Amount_planned?.toLocaleString() || '0'} planned
                    </p>
                  </div>
                )}
                {coverageData?.Capacity_operating !== undefined && coverageData?.Capacity_planned !== undefined && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Capacity Coverage</p>
                    <p className="text-xl font-medium">
                      {(coverageData.Capacity_operating + coverageData.Capacity_planned).toLocaleString()} MW
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {coverageData.Capacity_operating.toLocaleString()} MW operating
                      {"\n"}
                      {coverageData.Capacity_planned.toLocaleString()} MW planned
                    </p>
                  </div>
                )}
                {coverageData?.Emissions_operating !== undefined && coverageData?.Emissions_planned !== undefined && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Emissions Coverage</p>
                    <p className="text-xl font-medium">
                      {(coverageData.Emissions_operating + coverageData.Emissions_planned).toFixed(2)} MtCO₂e
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {coverageData.Emissions_operating.toFixed(2)} MtCO₂e operating
                      {"\n"}
                      {coverageData.Emissions_planned.toFixed(2)} MtCO₂e planned
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Progress Report Section */}
        <div className="space-y-4 border-t pt-4">
          <p className="text-lg font-medium">Progress Report</p>
          
          {/* 2025 NDC Status */}
          {data.NDC_2025_status && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge>2025 NDC</Badge>
                <span className="font-medium">{data.NDC_2025_status}</span>
              </div>
              {data.NDC_2025_statement && (
                <p className="text-sm text-muted-foreground">{data.NDC_2025_statement}</p>
              )}
              {data.NDC_2025_source && (
                <a 
                  href={data.NDC_2025_source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1"
                >
                  Source Document
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}
            </div>
          )}

          {/* 2020 NDC Status */}
          {data.NDC_2020_status && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge>2020 NDC</Badge>
                <span className="font-medium">{data.NDC_2020_status}</span>
              </div>
              {data.NDC_2020_statement && (
                <p className="text-sm text-muted-foreground">{data.NDC_2020_statement}</p>
              )}
              {data.NDC_2020_source && (
                <a 
                  href={data.NDC_2020_source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1"
                >
                  Source Document
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

