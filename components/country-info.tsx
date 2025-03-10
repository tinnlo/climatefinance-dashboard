"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { convertToIso3 } from "@/lib/utils"

interface CountryData {
  Country_ISO3: string
  Country: string
  Emission_2023: number
  End_target_percentage_reduction?: number
  End_target_baseline_year?: number
  End_target_year?: number
  Status_of_end_target?: string
  Date_of_last_status_update?: number
  End_target_text?: string
  Population?: number
  Last_updated: string
  NDC_2020_status?: string
  NDC_2020_statement?: string
  NDC_2020_source?: string
  NDC_2025_status?: string
  NDC_2025_statement?: string
  NDC_2025_source?: string
}

export function CountryInfo({ country = "in" }: { country?: string }) {
  const [data, setData] = useState<CountryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCountryData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const iso3Code = convertToIso3(country)
        console.log(`Converting country code: ${country} -> ${iso3Code}`)
        
        const response = await fetch('/api/country-info')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const allCountryData = await response.json()
        if (!Array.isArray(allCountryData)) {
          console.error('Unexpected data format:', allCountryData)
          throw new Error('Received invalid data format from API')
        }
        
        console.log('API Response:', {
          totalCountries: allCountryData.length,
          firstFew: allCountryData.slice(0, 3),
          searchingFor: iso3Code
        })
        
        const countryData = allCountryData.find((c: CountryData) => c.Country_ISO3 === iso3Code)
        console.log('Found country data:', countryData)
        
        setData(countryData || null)
      } catch (error) {
        console.error('Error fetching country data:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch country data')
      } finally {
        setLoading(false)
      }
    }

    fetchCountryData()
  }, [country])

  if (loading) {
    return (
      <Card className="dark:bg-[#2F3A2F]">
        <CardContent className="flex items-center justify-center h-[200px]">
          <p>Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="dark:bg-[#2F3A2F]">
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="dark:bg-[#2F3A2F]">
        <CardContent className="flex items-center justify-center h-[200px]">
          <p>No data available for country code: {country}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="dark:bg-[#2F3A2F]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-4xl font-semibold">{data.Country.toUpperCase()}</CardTitle>
          <div className="flex gap-2">
            {data.Status_of_end_target && (
              <Badge variant="outline">{data.Status_of_end_target}</Badge>
            )}
            {data.Date_of_last_status_update && (
              <Badge variant="secondary">Last Updated: {data.Date_of_last_status_update}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Population</p>
              <p className="text-xl font-medium">
                {data.Population ? data.Population.toLocaleString() : 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Emissions (2023)</p>
              <p className="text-xl font-medium">{data.Emission_2023.toFixed(2)} Mt CO2e/year</p>
            </div>
            <div className="col-span-2 space-y-1">
              <p className="text-sm text-muted-foreground">Target Year</p>
              <p className="text-xl font-medium">
                {data.End_target_year || 'N/A'}
              </p>
            </div>
            {data.End_target_percentage_reduction && (
              <div className="col-span-2 space-y-1">
                <p className="text-sm text-muted-foreground">Emission Reduction Target</p>
                <p className="text-xl font-medium">
                  {data.End_target_percentage_reduction}% by {data.End_target_year}
                  {data.End_target_baseline_year && (
                    <span className="text-sm ml-2">
                      (from {data.End_target_baseline_year} baseline)
                    </span>
                  )}
                </p>
              </div>
            )}
            {data.NDC_2025_status && (
              <div className="col-span-2 space-y-1">
                <p className="text-sm text-muted-foreground">NDC 2025 Status</p>
                <p className="text-xl font-medium">{data.NDC_2025_status}</p>
                {data.NDC_2025_statement && (
                  <p className="text-sm text-muted-foreground mt-1">{data.NDC_2025_statement}</p>
                )}
              </div>
            )}
            {data.End_target_text && (
              <div className="col-span-2 space-y-1">
                <p className="text-sm text-muted-foreground">Target Details</p>
                <p className="text-sm text-muted-foreground mt-1">{data.End_target_text}</p>
              </div>
            )}
            {data.NDC_2020_statement && (
              <div className="col-span-2 space-y-1">
                <p className="text-sm text-muted-foreground">NDC 2020 Statement</p>
                <p className="text-sm text-muted-foreground mt-1">{data.NDC_2020_statement}</p>
                {data.NDC_2020_source && (
                  <a 
                    href={data.NDC_2020_source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mt-1 inline-flex items-center gap-1"
                    onClick={(e) => {
                      e.preventDefault()
                      window.open(data.NDC_2020_source, '_blank', 'noopener,noreferrer')
                    }}
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
        </div>
      </CardContent>
    </Card>
  )
}

