"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { COUNTRY_NAMES } from "@/lib/constants"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { Info, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const COST_VARIABLES = [
  { id: "cost_battery_grid", name: "Grid Battery Cost", color: "#d67f55" },
  { id: "cost_battery_long", name: "Long-term Battery Cost", color: "#ad8267" },
  { id: "cost_battery_pe", name: "PE Battery Cost", color: "#848579" },
  { id: "cost_battery_short", name: "Short-term Battery Cost", color: "#5b888b" },
  { id: "investment_cost", name: "Investment Cost", color: "#329b9d" },
  { id: "opportunity_cost", name: "Opportunity Cost", color: "#00B4D8" },
]

const FIGURE_NOTES = `In this Figure, the breakdown of the decarbonization costs of EMDEs as a whole and eight countries with large power sector emissions (i.e., India, USA, Indonesia, Vietnam, Türkiye, Germany, Poland, and Kazakhstan) are displayed, for both the time horizon to 2035 and the time horizon to 2050. Country costs of decarbonization consist of (i) the opportunity costs to phase out fossil fuel power plants early (i.e., the stranded asset value of a power plant (defined as the expected discounted value of future missed cashflows of the power plant resulting from closing it down early according to NGFS NZ2050-1.5°C-50% decarbonization scenario relative to free cashflows earned in the NGFS GCAM6.0 Current Policy scenario), the compensation to power plant workers for missed wages; and retraining cost); the (ii) investment costs in renewable power plants (plus supporting short- and long-duration energy storage and grid extensions) to replace the fossil fuel power plants that are closed early keep up with any growth in electricity demand. Here we assume that each country, and EMDEs as a whole, pays for all its decarbonization costs (i.e., no foreign climate finance offerings or private sector co-payment). For each country, and for EMDEs as a whole, we assume decarbonization occurs via a decarbonization pathway in line with the NGFS NZ2050-1.5°C-50% decarbonization scenario. We use the NGFS GCAM6.0 Current Policy scenario to project electricity demand, for each fossil fuel power plant type, in each country, under business-as-usual.`

interface StackedCostChartProps {
  className?: string
  country?: string
}

export function StackedCostChart({ className, country = "in" }: StackedCostChartProps) {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleVariables, setVisibleVariables] = useState<string[]>(COST_VARIABLES.map((v) => v.id))
  const { theme } = useTheme()
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/cost-variables?country=${country}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const result = await response.json()
        setData(result.data)
      } catch (e: any) {
        console.error("Error fetching cost variables data:", e)
        setError(e.message || "An error occurred while fetching data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [country])

  const toggleVariable = (variableId: string) => {
    setVisibleVariables((prev) =>
      prev.includes(variableId) ? prev.filter((id) => id !== variableId) : [...prev, variableId],
    )
  }

  const tooltipStyle = {
    backgroundColor: theme === "dark" ? "rgba(31, 41, 55, 0.95)" : "rgba(255, 255, 255, 0.95)",
    border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
    borderRadius: "6px",
    padding: "12px",
    color: theme === "dark" ? "white" : "black",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  }

  const tooltipLabelStyle = {
    color: theme === "dark" ? "white" : "black",
    fontWeight: "bold",
    marginBottom: "4px",
  }

  const tooltipItemStyle = {
    color: theme === "dark" ? "white" : "black",
  }

  const handleDownload = () => {
    // Check if user is authenticated
    if (isAuthenticated) {
      // Redirect to the download page with query parameters
      router.push(`/downloads/stacked-cost?country=${country}`);
    } else {
      // Redirect to login page with return URL
      router.push(`/login?returnTo=/downloads/stacked-cost?country=${country}`);
    }
  }

  if (isLoading) {
    return (
      <Card className={cn("dark:bg-[#2F3A2F] flex flex-col h-[600px]", className)}>
        <CardHeader className="flex-none pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Aggregated Cost Variables Over Time</CardTitle>
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
          <CardDescription>Loading data for {COUNTRY_NAMES[country]}...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
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
      <Card className={cn("dark:bg-[#2F3A2F] flex flex-col h-[600px]", className)}>
        <CardHeader className="flex-none pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Aggregated Cost Variables Over Time</CardTitle>
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
          <CardDescription>Error loading data for {COUNTRY_NAMES[country]}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center text-destructive">
          <p>{error || "Failed to load data. Please try again later."}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("dark:bg-[#2F3A2F] flex flex-col h-[600px]", className)}>
      <CardHeader className="flex-none pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Aggregated Cost Variables Over Time</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownload} size="sm" className="h-8">
              <Download className="mr-2 h-4 w-4" />
              Download Data
            </Button>
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
        </div>
        <CardDescription>Cost components from 2025 to 2050 - {COUNTRY_NAMES[country]}</CardDescription>
        <div className="flex flex-wrap gap-2 mt-2">
          {COST_VARIABLES.map((variable) => (
            <div key={variable.id} className="flex items-center space-x-2">
              <Checkbox
                id={`variable-${variable.id}`}
                checked={visibleVariables.includes(variable.id)}
                onCheckedChange={() => toggleVariable(variable.id)}
              />
              <Label htmlFor={`variable-${variable.id}`} className="text-xs flex items-center">
                <div className="w-3 h-3 mr-1 rounded-sm" style={{ backgroundColor: variable.color }} />
                {variable.name}
              </Label>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="year"
                tick={{ fill: theme === "dark" ? "#ffffff" : "#000000" }}
                angle={-45}
                textAnchor="end"
                height={60}
                tickMargin={20}
              />
              <YAxis
                label={{
                  value: "Cost (Trillion USD)",
                  angle: -90,
                  position: "insideLeft",
                  fill: theme === "dark" ? "#ffffff" : "#000000",
                  offset: 0,
                }}
                tick={{ fill: theme === "dark" ? "#ffffff" : "#000000" }}
                tickMargin={10}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value: number, name: string) => [`${value.toFixed(2)}T USD`, name]}
                cursor={{ fill: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" }}
              />
              {COST_VARIABLES.filter((v) => visibleVariables.includes(v.id)).map((variable) => (
                <Bar key={variable.id} dataKey={variable.id} stackId="a" fill={variable.color} name={variable.name} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

