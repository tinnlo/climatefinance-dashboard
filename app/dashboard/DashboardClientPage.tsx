"use client"

import { createElement as h, useState, useEffect } from "react"
import { ClimateFinanceChart } from "@/components/climate-finance-chart"
import { SystemCostBenefits } from "@/components/system-cost-benefits"
import { CountryInfo } from "@/components/country-info"
import { Header } from "@/components/header"
import { PhaseOutMap } from "@/components/phase-out-map"
import { PhaseOutChart } from "@/components/phase-out-chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Info } from "lucide-react"
import { COUNTRY_NAMES } from "@/lib/constants"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StackedCostChart } from "@/components/stacked-cost-chart"
import { Button } from "@/components/ui/button"
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

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country)
  }

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    // Fetch map data
    fetch(`/api/map-data?country=${selectedCountry}&order=${selectedOrder}`)
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
    fetch(`/api/phase-out-data?country=${selectedCountry}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error)
        }
        setPhaseOutData(data)
      })
      .catch((error) => {
        console.error("Error fetching phase-out data:", error)
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
          { className: "lg:col-span-4" },
          h(SystemCostBenefits, { country: selectedCountry, className: "h-[500px]" }),
        ),
        h(
          "div",
          { className: "lg:col-span-6" },
          h(StackedCostChart, { country: selectedCountry, className: "h-[500px]" }),
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
                ? h(Alert, { variant: "destructive" }, h(AlertTitle, null, "Error"), h(AlertDescription, null, error))
                : mapData
                  ? h(PhaseOutMap, { data: mapData })
                  : h(
                      "div",
                      { className: "flex justify-center items-center h-[600px] text-muted-foreground" },
                      `No map data available for ${COUNTRY_NAMES[selectedCountry]}`,
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
            h(CardDescription, null, `Annual emissions reduction and cumulative avoided emissions for ${COUNTRY_NAMES[selectedCountry]}`),
          ),
          h(
            CardContent,
            null,
            phaseOutData
              ? h(PhaseOutChart, { country: selectedCountry, data: phaseOutData })
              : h(
                  "div",
                  { className: "flex justify-center items-center h-[400px] text-muted-foreground" },
                  `No phase-out data available for ${COUNTRY_NAMES[selectedCountry]}`,
                ),
          ),
        ),
      ),
    ),
  )
}

