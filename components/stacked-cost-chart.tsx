"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { COUNTRY_NAMES } from "@/lib/constants"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

const COST_VARIABLES = [
  { id: "cost_battery_grid", name: "Grid Battery Cost", color: "#d67f55" },
  { id: "cost_battery_long", name: "Long-term Battery Cost", color: "#ad8267" },
  { id: "cost_battery_pe", name: "PE Battery Cost", color: "#848579" },
  { id: "cost_battery_short", name: "Short-term Battery Cost", color: "#5b888b" },
  { id: "investment_cost", name: "Investment Cost", color: "#329b9d" },
  { id: "opportunity_cost", name: "Opportunity Cost", color: "#00B4D8" },
]

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

  if (isLoading) {
    return (
      <Card className={cn("dark:bg-[#2F3A2F] flex flex-col", className)}>
        <CardHeader className="flex-none">
          <CardTitle>Aggregated Cost Variables Over Time</CardTitle>
          <CardDescription>Loading data for {COUNTRY_NAMES[country]}...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex items-center justify-center">
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
      <Card className={cn("dark:bg-[#2F3A2F] flex flex-col", className)}>
        <CardHeader className="flex-none">
          <CardTitle>Aggregated Cost Variables Over Time</CardTitle>
          <CardDescription>Error loading data for {COUNTRY_NAMES[country]}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex items-center justify-center text-destructive">
          <p>{error || "Failed to load data. Please try again later."}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("dark:bg-[#2F3A2F] flex flex-col", className)}>
      <CardHeader className="flex-none">
        <CardTitle>Aggregated Cost Variables Over Time</CardTitle>
        <CardDescription>Cost components from 2025 to 2050 - {COUNTRY_NAMES[country]}</CardDescription>
        <div className="flex flex-wrap gap-2 mb-4">
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
      <CardContent className="flex-1 min-h-0">
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="year"
                tick={{ fill: theme === "dark" ? "#ffffff" : "#000000" }}
                angle={-45}
                textAnchor="end"
                height={40}
              />
              <YAxis
                label={{
                  value: "Cost (Trillion USD)",
                  angle: -90,
                  position: "insideLeft",
                  fill: theme === "dark" ? "#ffffff" : "#000000",
                }}
                tick={{ fill: theme === "dark" ? "#ffffff" : "#000000" }}
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

