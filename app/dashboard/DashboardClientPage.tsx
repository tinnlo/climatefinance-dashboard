"use client"

import { createElement as h, useState, useEffect } from "react"
import { AlignmentChart } from "@/components/alignment-chart"
import { SystemCostBenefits } from "@/components/system-cost-benefits"
import { CountryInfo } from "@/components/country-info"
import { Header } from "@/components/header"
import { PhaseOutMap } from "@/components/phase-out-map"
import { PhaseOutChart } from "@/components/phase-out-chart"
import { SearchCountry } from "@/components/search-country"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Info, LogIn } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StackedCostChart } from "@/components/stacked-cost-chart"
import { Button } from "@/components/ui/button"
import { convertToIso3 } from "@/lib/utils"
import { COUNTRY_NAMES } from "@/lib/constants"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const orders = [
  { value: "maturity", label: "By Power Plant Maturity" },
  { value: "emission_factor", label: "By Power Plant Emission Intensity" },
  { value: "emissions_per_OC_maturity", label: "By Power Plant Benefits/Costs (Including Plant Maturity)" },
]

const PHASE_OUT_NOTES = "Placeholder for phase-out chart figure notes. This will be replaced with detailed information about the methodology, data sources, and interpretation of the phase-out chart."

export default function DashboardClientPage() {
  const [selectedCountry, setSelectedCountry] = useState("in")
  const [selectedOrder, setSelectedOrder] = useState("maturity")
  const [mapData, setMapData] = useState(null)
  const [phaseOutData, setPhaseOutData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country)
  }

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    // Get three-letter ISO code for API calls
    const countryCode = convertToIso3(selectedCountry)

    // Fetch map data
    fetch(`/api/map-data?country=${countryCode}&order=${selectedOrder}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error)
        }
        setMapData(data)
      })
      .catch((error) => {
        console.error("Error fetching map data:", error)
        setError("Failed to load map data. Please try again later.")
      })

    // Fetch phase-out data
    fetch(`/api/phase-out-data?country=${countryCode}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error)
        }
        setPhaseOutData(data)
      })
      .catch((error) => {
        console.error("Error fetching phase-out data:", error)
        setPhaseOutData(null) // Ensure phaseOutData is null on error
        setError((prev) =>
          prev
            ? `${prev} Also, failed to load phase-out data.`
            : "Failed to load phase-out data. Please try again later."
        )
      })
      .finally(() => setIsLoading(false))
  }, [selectedCountry, selectedOrder, isAuthenticated])

  // Render CTA component for non-authenticated users
  const renderAuthCTA = () => {
    // Create the return URL for after login
    const returnUrl = encodeURIComponent("/dashboard")
    
    return h(
      Card,
      { className: "bg-white dark:bg-[#2F3A2F] text-forest dark:text-white border border-border dark:border-0 my-6" },
      h(
        CardContent,
        { className: "py-6" },
        h(
          "div",
          { className: "text-center space-y-4" },
          h("h3", { className: "text-lg md:text-xl font-semibold" }, "Sign in to view detailed phase-out data"),
          h("p", { className: "text-gray-700 dark:text-gray-300 max-w-2xl mx-auto text-sm" }, 
            "The phase-out chart and map visualizations provide valuable insights into power plant retirement schedules. " +
            "Please sign in or create an account to access these premium features."
          ),
          h(
            Link,
            { href: `/login?returnTo=${returnUrl}` },
            h(
              Button,
              { 
                className: "bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-black/90 text-forest dark:text-white border border-forest dark:border-0 px-5 py-2 text-sm rounded-full transition-all duration-300 shadow-lg hover:shadow-xl mt-2"
              },
              h(LogIn, { className: "mr-2 h-4 w-4" }),
              "Sign in to access phase-out data"
            )
          )
        )
      )
    )
  }

  // Render phase-out components for authenticated users
  const renderPhaseOutComponents = () => {
    return h(
      "div",
      { className: "space-y-6" },
      // Phase-Out Map
      h(
        Card,
        { className: "w-full dark:bg-black" },
        h(
          CardHeader,
          null,
          h(CardTitle, null, "Power Plant Phase-Out Pipeline"),
          h(CardDescription, null, `Visualizing phase-out schedules for ${COUNTRY_NAMES[selectedCountry]}`)
        ),
        h(
          CardContent,
          null,
          isLoading
            ? h(
                "div",
                { className: "flex justify-center items-center h-[600px]" },
                h(Loader2, { className: "h-8 w-8 animate-spin" })
              )
            : error
              ? h(
                  "div",
                  { className: "flex justify-center items-center h-[600px]" },
                  h("span", { className: "text-muted-foreground text-lg" }, "No data available for this country and scenario.")
                )
              : mapData
                ? h(PhaseOutMap, { 
                    data: mapData, 
                    country: selectedCountry, 
                    chartData: phaseOutData,
                    selectedOrder: selectedOrder,
                    onOrderChange: setSelectedOrder 
                  })
                : h(
                    "div",
                    { className: "flex justify-center items-center h-[600px] text-muted-foreground" },
                    "No data available for this country and scenario."
                  )
        )
      )
    )
  }

  return h(
    "div",
    { className: "flex min-h-screen flex-col bg-gradient-to-br from-background via-background/95 to-forest/30" },
    h(Header, { selectedCountry: selectedCountry, onCountryChange: handleCountryChange }),
    h(
      "main",
      { className: "flex-1 space-y-6 p-8 pt-6" },
      h("div", { className: "mx-auto max-w-[1600px]" },
        h(
          "div",
          { className: "space-y-4" },
          h(
            "div",
            { className: "flex items-center justify-between" },
            h("h2", { className: "text-3xl font-light tracking-tight" }, "Dashboard (Beta)"),
            h(
              "div",
              { className: "text-sm text-muted-foreground" },
              "Showing data for ",
              h("span", { className: "font-medium" }, COUNTRY_NAMES[selectedCountry]),
            ),
          ),
          h(SearchCountry, { onCountryChange: handleCountryChange, defaultValue: selectedCountry }),
        ),
        h(
          "div",
          { className: "grid grid-cols-1 lg:grid-cols-10 gap-4 mt-6 mb-6" },
          h(
            "div",
            { className: "lg:col-span-6" },
            h(CountryInfo, { className: "h-full", country: selectedCountry }),
          ),
          h(
            "div",
            { className: "lg:col-span-4" },
            h(AlignmentChart, { className: "h-full", country: selectedCountry }),
          ),
        ),
        h(
          "div",
          { className: "grid grid-cols-1 lg:grid-cols-10 gap-4 mb-6" },
          h(
            "div",
            { className: "lg:col-span-4 h-[650px]" },
            h(SystemCostBenefits, { className: "h-full", country: selectedCountry }),
          ),
          h(
            "div",
            { className: "lg:col-span-6 h-[650px]" },
            h(StackedCostChart, { className: "h-full", country: selectedCountry }),
          ),
        ),
        // Conditionally render either phase-out components or auth CTA
        isAuthenticated ? renderPhaseOutComponents() : renderAuthCTA()
      )
    )
  )
}

