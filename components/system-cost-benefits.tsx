"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { COUNTRY_NAMES } from "@/lib/constants"
import { useTheme } from "next-themes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Download, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const FIGURE_NOTES = "Placeholder for system cost and benefits figure notes. This will be replaced with detailed information about the methodology, data sources, and interpretation of the system cost and benefits chart."

// Colors for the pie charts
const COLORS = {
  costs: ["#ff7c43", "#ffa600", "#ff9e6d"],
  benefits: ["#00b4d8", "#0096c7"],
}

// Dummy scenarios for the dropdown
const scenarios = [
  { value: "baseline", label: "Baseline" },
  { value: "optimistic", label: "Optimistic" },
  { value: "conservative", label: "Conservative" },
]

// Dummy time horizons for the dropdown
const timeHorizons = [
  { value: "2025", label: "Until 2025" },
  { value: "2035", label: "Until 2035" },
]

export function SystemCostBenefits({ className, country = "in" }: { className?: string; country?: string }) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
  const [selectedScenario, setSelectedScenario] = useState("baseline")
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState("2025")
  const { isAuthenticated } = useAuth()

  const router = useRouter()

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    fetch(`/api/system-cost-benefits?country=${country}`)
      .then((res) => res.json())
      .then((fetchedData) => {
        if (fetchedData.error) {
          throw new Error(fetchedData.error)
        }
        setData(fetchedData)
      })
      .catch((err) => {
        console.error("Error fetching system cost benefits data:", err)
        setError(err.message || "Failed to load data")
      })
      .finally(() => setIsLoading(false))
  }, [country])

  const handleDownload = () => {
    // Check if user is authenticated
    if (isAuthenticated) {
      // Redirect to the download page with query parameters
      router.push(`/downloads/system-cost-benefits?country=${country}&scenario=${selectedScenario}&timeHorizon=${selectedTimeHorizon}`);
    } else {
      // Redirect to login page with return URL
      router.push(`/login?returnTo=/downloads/system-cost-benefits?country=${country}&scenario=${selectedScenario}&timeHorizon=${selectedTimeHorizon}`);
    }
  }

  if (isLoading) {
    return (
      <Card className="dark:bg-[#2F3A2F]">
        <CardHeader>
          <CardTitle>System Cost and Benefits</CardTitle>
          <CardDescription>Loading data for {COUNTRY_NAMES[country]}...</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="dark:bg-[#2F3A2F]">
        <CardHeader>
          <CardTitle>System Cost and Benefits</CardTitle>
          <CardDescription>
            Data temporarily unavailable for {COUNTRY_NAMES[country]}. Please try again later.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
          <p>We're working on gathering this data. Please check back soon.</p>
        </CardContent>
      </Card>
    )
  }

  const tooltipStyle = {
    backgroundColor: theme === "dark" ? "rgba(31, 41, 55, 0.85)" : "rgba(255, 255, 255, 0.85)",
    border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
    borderRadius: "6px",
    padding: "12px",
    color: theme === "dark" ? "white" : "black",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    zIndex: 1000,
  }

  const renderTooltipContent = (props: any) => {
    const { payload } = props
    if (!payload || !payload[0]) return null

    const data = payload[0].payload
    const bgColor = theme === "dark" ? "rgba(31, 41, 55, 0.95)" : "rgba(255, 255, 255, 0.95)"
    const textColor = theme === "dark" ? "white" : "black"
    const borderColor = theme === "dark" ? "#374151" : "#e5e7eb"

    return (
      <div style={tooltipStyle}>
        <p style={{ color: tooltipStyle.color, marginBottom: "4px", fontWeight: 500 }}>{data.name}</p>
        <p style={{ color: tooltipStyle.color, opacity: 0.9 }}>${data.value.toFixed(2)}T</p>
        <p style={{ color: tooltipStyle.color, opacity: 0.9 }}>
          {((data.value / (data.type === "cost" ? data.totalCost : data.totalBenefit)) * 100).toFixed(1)}%
        </p>
      </div>
    )
  }

  const costsData = data.costs.map((item: any) => ({
    ...item,
    type: "cost",
    totalCost: data.totalCost,
  }))

  const benefitsData = data.benefits.map((item: any) => ({
    ...item,
    type: "benefit",
    totalBenefit: data.totalBenefit,
  }))

  return (
    <Card className={cn("flex flex-col h-full dark:bg-[#2F3A2F]", className)}>
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between">
          <CardTitle>System Cost and Benefits</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="h-4 w-4" />
                <span className="sr-only">Figure Notes</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Figure Notes</DialogTitle>
              </DialogHeader>
              <DialogDescription className="text-sm leading-relaxed whitespace-pre-line">
                {FIGURE_NOTES}
              </DialogDescription>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Comparison of total costs and benefits (Trillion USD) - {COUNTRY_NAMES[country]}
        </CardDescription>
        <div className="flex flex-wrap gap-4 mt-4">
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger className="w-[180px]">
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
          <Select value={selectedTimeHorizon} onValueChange={setSelectedTimeHorizon}>
            <SelectTrigger className="w-[180px]">
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
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 h-full">
          <div className="w-full flex flex-col justify-center">
            <div className="relative h-[160px] md:h-[220px] lg:h-[250px] mx-auto w-full max-w-[300px]">
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              >
                <p className="text-2xl md:text-2xl font-bold leading-none mb-1">${data.totalCost.toFixed(1)}T</p>
                <p className="text-sm md:text-sm text-muted-foreground">{data.costGdpPercentage}% of GDP</p>
              </div>
              <ResponsiveContainer width="100%" height="100%" style={{ position: 'relative', zIndex: 1 }}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={costsData}
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {costsData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-cost-${index}`}
                        fill={entry.color || COLORS.costs[index % COLORS.costs.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={renderTooltipContent} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center font-medium text-base mt-1 md:mt-2">Total Cost</p>
          </div>

          <div className="w-full flex flex-col justify-center">
            <div className="relative h-[160px] md:h-[220px] lg:h-[250px] mx-auto w-full max-w-[300px]">
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              >
                <p className="text-2xl md:text-2xl font-bold leading-none mb-1">${data.totalBenefit.toFixed(1)}T</p>
                <p className="text-sm md:text-sm text-muted-foreground">{data.benefitGdpPercentage}% of GDP</p>
              </div>
              <ResponsiveContainer width="100%" height="100%" style={{ position: 'relative', zIndex: 1 }}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={benefitsData}
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {benefitsData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-benefit-${index}`}
                        fill={entry.color || COLORS.benefits[index % COLORS.benefits.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={renderTooltipContent} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center font-medium text-base mt-1 md:mt-2">Total Benefit</p>
          </div>
        </div>

        <div className="flex justify-center mt-2 md:mt-4">
          <Button variant="outline" onClick={handleDownload} className="bg-black/20 py-4 text-sm w-full md:w-auto mx-4 md:mx-0">
            <Download className="mr-2 h-4 w-4" />
            Download Yearly Data
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

