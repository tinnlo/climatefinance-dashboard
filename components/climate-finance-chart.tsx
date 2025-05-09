"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts"
import { cn } from "@/lib/utils"
import { COUNTRY_NAMES } from "@/lib/constants"
import { useTheme } from "next-themes"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InfoDialog } from "@/components/ui/info-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const FIGURE_NOTES = "Placeholder for climate finance chart figure notes. This will be replaced with detailed information about the methodology, data sources, and interpretation of the climate finance needs visualization."

const COLORS = {
  finance: ["#b3de69", "#80b1d3", "#8dd3c7"],
  fiscal: ["#fdb462", "#fdb462"],
}

// Sample data for different countries
const sampleData = {
  in: {
    finance: [
      { name: "Inner Quantum", value: 124.3, color: "#b3de69" },
      { name: "Private CF", value: 340.3, color: "#80b1d3" },
      { name: "Outer Quantum", value: 464.6, color: "#8dd3c7" },
    ],
    fiscal: [
      { name: "% of Cumulative GDP till 2035", value: 0.6, color: "#fdb462" },
      { name: "% Current GDP", value: 2.0, color: "#fdb462" },
    ],
  },
  id: {
    finance: [
      { name: "Inner Quantum", value: 98.5, color: "#b3de69" },
      { name: "Private CF", value: 280.2, color: "#80b1d3" },
      { name: "Outer Quantum", value: 390.1, color: "#8dd3c7" },
    ],
    fiscal: [
      { name: "% of Cumulative GDP till 2035", value: 0.8, color: "#fdb462" },
      { name: "% Current GDP", value: 2.3, color: "#fdb462" },
    ],
  },
  us: {
    finance: [
      { name: "Inner Quantum", value: 180.7, color: "#b3de69" },
      { name: "Private CF", value: 420.5, color: "#80b1d3" },
      { name: "Outer Quantum", value: 550.2, color: "#8dd3c7" },
    ],
    fiscal: [
      { name: "% of Cumulative GDP till 2035", value: 0.4, color: "#fdb462" },
      { name: "% Current GDP", value: 1.5, color: "#fdb462" },
    ],
  },
  default: {
    finance: [
      { name: "Inner Quantum", value: 124.3, color: "#b3de69" },
      { name: "Private CF", value: 340.3, color: "#80b1d3" },
      { name: "Outer Quantum", value: 464.6, color: "#8dd3c7" },
    ],
    fiscal: [
      { name: "% of Cumulative GDP till 2035", value: 0.6, color: "#fdb462" },
      { name: "% Current GDP", value: 2.0, color: "#fdb462" },
    ],
  },
}

export function ClimateFinanceChart({ className, country = "in" }: { className?: string; country?: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/climate-finance?country=${country}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch data")
        }
        return res.json()
      })
      .then((data) => {
        setData(data)
      })
      .catch((error) => {
        console.error("Error fetching data:", error)
        setData(sampleData[country as keyof typeof sampleData] || sampleData.default)
      })
      .finally(() => setLoading(false))
  }, [country])

  if (loading) {
    return (
      <Card className={cn("dark:bg-[#2F3A2F]", className)}>
        <CardHeader>
          <CardTitle>Annual Climate Finance Needs</CardTitle>
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

  if (error) {
    return (
      <Card className={cn("dark:bg-[#2F3A2F]", className)}>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data || sampleData[country as keyof typeof sampleData] || sampleData.default

  const tooltipStyle = {
    backgroundColor: theme === "dark" ? "rgba(31, 41, 55, 0.95)" : "rgba(255, 255, 255, 0.95)",
    border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
    borderRadius: "6px",
    padding: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    zIndex: 1000
  }

  const tooltipLabelStyle = {
    color: theme === "dark" ? "white" : "black",
    fontWeight: 500,
    marginBottom: "4px"
  }

  const tooltipItemStyle = {
    color: theme === "dark" ? "white" : "black",
    opacity: 0.9
  }

  const axisStyle = {
    fontSize: "12px",
    fill: "rgb(156 163 175)", // matches text-muted-foreground
    fontWeight: 500,
  }

  return (
    <Card className={cn("dark:bg-[#2F3A2F]", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Annual Climate Finance Needs
          <InfoDialog>
            <p>
              {FIGURE_NOTES}
            </p>
          </InfoDialog>
        </CardTitle>
        <CardDescription>Fiscal Cost (%) 2025-2035 - {COUNTRY_NAMES[country]}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 md:space-y-6">
          <div className="h-[180px] md:h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.finance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  style={axisStyle}
                  tickLine={{ stroke: "rgb(156 163 175)" }}
                  axisLine={{ stroke: "rgb(156 163 175)" }}
                />
                <YAxis
                  domain={[0, 500]}
                  tickFormatter={(value) => `${value}`}
                  style={axisStyle}
                  tickLine={{ stroke: "rgb(156 163 175)" }}
                  axisLine={{ stroke: "rgb(156 163 175)" }}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value: number) => [`$${value.toFixed(1)}bn`, "Value"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.finance.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS.finance[index % COLORS.finance.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="h-[180px] md:h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.fiscal} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  style={axisStyle}
                  tickLine={{ stroke: "rgb(156 163 175)" }}
                  axisLine={{ stroke: "rgb(156 163 175)" }}
                />
                <YAxis
                  domain={[0, 2.5]}
                  tickFormatter={(value) => `${value}%`}
                  style={axisStyle}
                  tickLine={{ stroke: "rgb(156 163 175)" }}
                  axisLine={{ stroke: "rgb(156 163 175)" }}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Value"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.fiscal.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS.fiscal[index % COLORS.fiscal.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

