"use client"

import { createElement as h, useState, useEffect } from "react"
import { ClimateFinanceChart } from "@/components/climate-finance-chart"
import { SystemCostBenefits } from "@/components/system-cost-benefits"
import { CountryInfo } from "@/components/country-info"
import { Header } from "@/components/header"
import { PhaseOutMap } from "@/components/phase-out-map"
import { PhaseOutChart } from "@/components/phase-out-chart"
import { SearchCountry } from "@/components/search-country"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Info } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StackedCostChart } from "@/components/stacked-cost-chart"
import { Button } from "@/components/ui/button"
import { convertToIso3 } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Country names mapping
const COUNTRY_NAMES: { [key: string]: string } = {
  'eg': 'Egypt',
  'id': 'Indonesia',
  'in': 'India',
  'ir': 'Iran',
  'ke': 'Kenya',
  'mx': 'Mexico',
  'ng': 'Nigeria',
  'th': 'Thailand',
  'tz': 'Tanzania',
  'ug': 'Uganda',
  'vn': 'Vietnam',
  'za': 'South Africa'
} as const

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

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country)
  }

  useEffect(() => {
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
  }, [selectedCountry, selectedOrder])

  return h(
    "div",
    { className: "flex min-h-screen flex-col bg-gradient-to-br from-background via-background/95 to-forest/30" },
    h(Header, { selectedCountry: selectedCountry, onCountryChange: handleCountryChange }),
    h(
      "main",
      { className: "flex-1 space-y-6 p-8 pt-6" },
      h(
        "div",
        { className: "flex items-center justify-between" },
        h("h2", { className: "text-3xl font-light tracking-tight" }, "Dashboard"),
        h(
          "div",
          { className: "text-sm text-muted-foreground" },
          "Showing data for ",
          h("span", { className: "font-medium" }, COUNTRY_NAMES[selectedCountry]),
        ),
      ),
      h(
        "div",
        { className: "grid gap-6 md:grid-cols-2" },
        h(CountryInfo, { country: selectedCountry }),
        h(ClimateFinanceChart, { country: selectedCountry }),
      ),
      h(
        "div",
        { className: "grid gap-6 lg:grid-cols-10" },
        h(
          "div",
          { className: "lg:col-span-4 h-[700px] lg:h-[600px]" },
          h(SystemCostBenefits, { country: selectedCountry, className: "h-full" }),
        ),
        h(
          "div",
          { className: "lg:col-span-6 h-[700px] lg:h-[600px]" },
          h(StackedCostChart, { country: selectedCountry, className: "h-full" }),
        ),
      ),
      h(
        "div",
        { className: "space-y-6" },
        h(
          Card,
          { className: "w-full dark:bg-black" },
          h(
            CardHeader,
            null,
            h(CardTitle, null, "Power Plant Phase-Out Map"),
            h(CardDescription, null, `Visualizing phase-out schedules for ${COUNTRY_NAMES[selectedCountry]}`),
          ),
          h(
            CardContent,
            null,
            h(
              "div",
              { className: "flex gap-4 mb-4" },
              h(
                Select,
                { onValueChange: setSelectedOrder, defaultValue: selectedOrder },
                h(SelectTrigger, { className: "w-[280px]" }, h(SelectValue, { placeholder: "Select an order" })),
                h(
                  SelectContent,
                  null,
                  orders.map((order) => h(SelectItem, { key: order.value, value: order.value }, order.label)),
                ),
              ),
            ),
            isLoading
              ? h(
                  "div",
                  { className: "flex justify-center items-center h-[600px]" },
                  h(Loader2, { className: "h-8 w-8 animate-spin" }),
                )
              : error
                ? h(
                    "div",
                    { className: "flex justify-center items-center h-[600px]" },
                    h("span", { className: "text-muted-foreground text-lg" }, "No data available for this country and scenario.")
                  )
                : mapData
                  ? h(PhaseOutMap, { data: mapData })
                  : h(
                      "div",
                      { className: "flex justify-center items-center h-[600px] text-muted-foreground" },
                      "No data available for this country and scenario."
                    ),
          ),
        ),
        h(
          Card,
          { className: "dark:bg-[#2F3A2F]" },
          h(
            CardHeader,
            { className: "relative" },
            h(CardTitle, { className: "flex items-center justify-between" }, 
              "Phase-Out Pipeline",
              h(Dialog, null,
                h(DialogTrigger, { asChild: true },
                  h(Button, { 
                    variant: "ghost", 
                    size: "icon", 
                    className: "h-8 w-8" 
                  }, 
                    h(Info, { className: "h-4 w-4" }),
                    h("span", { className: "sr-only" }, "Figure Notes")
                  )
                ),
                h(DialogContent, { className: "max-w-3xl max-h-[80vh] overflow-y-auto" },
                  h(DialogHeader, null,
                    h(DialogTitle, null, "Figure Notes"),
                    h(DialogDescription, { className: "text-sm leading-relaxed whitespace-pre-line" }, 
                      PHASE_OUT_NOTES
                    )
                  )
                )
              )
            ),
            h(CardDescription, null, `Annual emissions reduction and cumulative avoided emissions for ${COUNTRY_NAMES[selectedCountry]}`)
          ),
          h(
            CardContent,
            null,
            isLoading
              ? h(
                  "div",
                  { className: "flex justify-center items-center h-[400px]" },
                  h(Loader2, { className: "h-8 w-8 animate-spin" })
                )
              : h(PhaseOutChart, { country: selectedCountry.toUpperCase(), data: phaseOutData })
          ),
        ),
      ),
    ),
  )
}

