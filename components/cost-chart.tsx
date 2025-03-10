"use client"

import { useState, useEffect } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Legend, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { COST_COLORS, COUNTRY_NAMES } from "@/lib/constants"
import type { CostData } from "@/lib/process-data"
import { cn } from "@/lib/utils"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const FIGURE_NOTES = "Placeholder for cost chart figure notes. This will be replaced with detailed information about the methodology, data sources, and interpretation of the cost variables chart."

interface ApiResponse {
  countries: {
    [key: string]: CostData | null
  }
}

// Mapping of full names to shorter names
const SHORT_NAMES: { [key: string]: string } = {
  "Opportunity Cost to Owners (Coal)": "Coal OC",
  "Opportunity Cost to Owners (Gas)": "Gas OC",
  "Opportunity Cost to Owners (Oil)": "Oil OC",
  "Grid Extension Investment": "Grid Ext",
  "Renewables for Electrolyzers Investment": "Renew Elec",
  "Long-term Storage Investment": "LT Storage",
  "Short-term Storage Investment": "ST Storage",
  "Renewable Energy Investment": "Renew Inv",
  "Workers Compensation & Retraining Costs": "Worker Comp",
}

export function CostChart({ className, country = "in" }: { className?: string; country?: string }) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    fetch(`/api/cost-data?country=${country}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok")
        }
        return response.json()
      })
      .then(setData)
      .catch((error) => {
        console.error("Error fetching data:", error)
        setError("Failed to load data")
      })
      .finally(() => setIsLoading(false))
  }, [country])

  if (isLoading) {
    return (
      <Card className={cn("dark:bg-[#2F3A2F]", className)}>
        <CardHeader>
          <CardTitle>Total Costs: Opportunity Costs and Renewable Energy Investments</CardTitle>
          <CardDescription>Loading data for {COUNTRY_NAMES[country]}...</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[400px] flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data || !data.countries[country]) {
    return (
      <Card className={cn("dark:bg-[#2F3A2F]", className)}>
        <CardHeader>
          <CardTitle>Total Costs: Opportunity Costs and Renewable Energy Investments</CardTitle>
          <CardDescription>
            Data temporarily unavailable for {COUNTRY_NAMES[country]}. Please try again later.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[400px] flex items-center justify-center text-muted-foreground">
          <p>We're working on gathering this data. Please check back soon.</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.countries[country]
  if (!chartData) {
    return (
      <Card className={cn("dark:bg-[#2F3A2F]", className)}>
        <CardHeader>
          <CardTitle>Total Costs: Opportunity Costs and Renewable Energy Investments</CardTitle>
          <CardDescription>No data available for {COUNTRY_NAMES[country]}</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[400px] flex items-center justify-center text-muted-foreground">
          <p>Data for this country is not available at the moment.</p>
        </CardContent>
      </Card>
    )
  }

  const formattedData = chartData.years.map((year, index) => {
    const dataPoint: { [key: string]: number } = { year }
    Object.entries(chartData.costs).forEach(([costType, values]) => {
      dataPoint[costType] = values[index]
    })
    return dataPoint
  })

  const chartConfig = Object.fromEntries(
    Object.entries(COST_COLORS).map(([key, color]) => [
      key,
      {
        label: SHORT_NAMES[key] || key,
        color: color,
      },
    ]),
  )

  return (
    <Card className={cn("dark:bg-[#2F3A2F]", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Total Costs: Opportunity Costs and Renewable Energy Investments</CardTitle>
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
        <CardDescription>All values are in Present Value (PV) - {COUNTRY_NAMES[country]}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <XAxis dataKey="year" />
            <YAxis
              tickFormatter={(value) => `${value.toFixed(1)}`}
              label={{ value: "Trillion USD", angle: -90, position: "insideLeft" }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [`${value.toFixed(3)}T USD`, SHORT_NAMES[name] || name]}
            />
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              wrapperStyle={{
                fontSize: "8px",
                width: "100%",
                marginTop: "10px",
              }}
              iconSize={8}
            />
            {Object.entries(COST_COLORS).map(([costType, color]) => (
              <Bar
                key={costType}
                dataKey={costType}
                stackId="a"
                fill={color}
                name={SHORT_NAMES[costType] || costType}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

