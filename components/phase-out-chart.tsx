"use client"

import { useState, useRef, useEffect } from "react"
import { useTheme } from "next-themes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts"
import { convertToIso3, iso2ToIso3Map } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { ResponsiveBar } from "@nivo/bar"

// Update scenario values to match the data structure
const scenarios = [
  { value: "maturity", label: "By Power Plant Maturity" },
  { value: "emission_factor", label: "By Power Plant Emission Factor" },
  { value: "benefits_cost_maturity", label: "By Emissions per Opportunity Cost" },
]

// Mapping for scenario names to file name parts
const scenarioToFileNameMap: { [key: string]: string } = {
  "maturity": "maturity",
  "emission_factor": "emission_factor",
  "benefits_cost_maturity": "emissions_per_OC_maturity"
}

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

interface PhaseOutData {
  year: number
  amount_mtco2: number
  cumulative_mtco2: number
  start_rank: number
  end_rank: number
  n_plants: number
  plants_by_subsector: {
    Coal: number
    Gas: number
    Oil: number
  }
}

export interface ChartData {
  country_code: string
  country_name: string
  scenarios: {
    [key: string]: PhaseOutData[]
  }
}

interface AssetData {
  uniqueforwardassetid: string
  asset_name: string
  subsector: string
  amount_mtco2: number
  year: number
  Country_ISO3: string
  Status: string
  Start_Year: number
  Retired_Year: number | null
  Capacity: number
  Capacity_Unit: string
  Emissions: number
  Emissions_Unit: string
}

interface PhaseOutChartProps {
  country: string
  data: any
  selectedScenario: string
}

export function PhaseOutChart({ country, data, selectedScenario }: PhaseOutChartProps) {
  const { theme } = useTheme()
  const currentTheme = theme === "system" ? "dark" : theme
  const countryCode = convertToIso3(country)
  const countryName = COUNTRY_NAMES[country.toLowerCase()] || countryCode

  // Check if data is available for the selected country and scenario
  if (!data || !data.scenarios || !data.scenarios[selectedScenario] || data.scenarios[selectedScenario].length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <span className="text-muted-foreground">
          No phase-out data available for {countryName} ({countryCode}) in the {scenarios.find(s => s.value === selectedScenario)?.label.toLowerCase() || selectedScenario} scenario.
        </span>
      </div>
    )
  }

  const chartData = data.scenarios[selectedScenario].map((item: PhaseOutData) => ({
    ...item,
    Coal: item.plants_by_subsector.Coal,
    Gas: item.plants_by_subsector.Gas,
    Oil: item.plants_by_subsector.Oil,
  }))

  const colors = {
    // Bar colors
    Coal: "#0194C5", // Brighter blue
    Gas: "#319B9D", // Teal
    Oil: "#e9c46a", // Yellow

    // Line colors
    annualReduction: "#e63946", // Bright red
    cumulativeEmissions: currentTheme === "dark" ? "#a8dadc" : "#1d3557",

    text: currentTheme === "dark" ? "#ffffff" : "#000000",
    background: currentTheme === "dark" ? "#333333" : "#ffffff",
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart 
          data={chartData}
          margin={{ 
            top: 20, 
            right: 30,
            left: 10,
            bottom: 5 
          }}
        >
          <XAxis
            dataKey="year"
            stroke={colors.text}
            tickFormatter={(value) => value.toString()}
            fontSize={12}
          />
          <YAxis
            yAxisId="left"
            stroke={colors.text}
            fontSize={12}
            width={50}
            label={{
              value: "Annual Reduction (MtCO2)",
              angle: -90,
              position: "insideLeft",
              fill: colors.text,
              fontSize: 11,
              dx: 0
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke={colors.text}
            fontSize={12}
            width={50}
            label={{
              value: "Cumulative (GtCO2)",
              angle: 90,
              position: "insideRight",
              fill: colors.text,
              fontSize: 11,
              dx: 0
            }}
            tickFormatter={(value) => (value / 1000).toFixed(1)}
          />
          <Tooltip
            wrapperStyle={{ zIndex: 1000 }}
            contentStyle={{ 
              backgroundColor: currentTheme === "dark" ? "rgba(31, 41, 55, 0.95)" : "rgba(255, 255, 255, 0.95)",
              border: `1px solid ${currentTheme === "dark" ? "#374151" : "#e5e7eb"}`,
              borderRadius: "6px",
              padding: "12px"
            }}
            formatter={(value: any, name: string) => {
              if (name === "Annual emissions reduction") {
                return [`${Number(value).toFixed(2)} MtCO2`, name]
              }
              return [`${(Number(value) / 1000).toFixed(2)} GtCO2`, name]
            }}
            labelFormatter={(label) => `Year: ${label}`}
          />

          {/* Stacked Bars */}
          <Bar yAxisId="left" dataKey="Coal" stackId="a" fill={colors.Coal} name="Coal" />
          <Bar yAxisId="left" dataKey="Gas" stackId="a" fill={colors.Gas} name="Gas" />
          <Bar yAxisId="left" dataKey="Oil" stackId="a" fill={colors.Oil} name="Oil" />

          {/* Lines */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="amount_mtco2"
            stroke={colors.annualReduction}
            strokeWidth={2}
            dot={false}
            name="Annual emissions reduction"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulative_mtco2"
            stroke={colors.cumulativeEmissions}
            strokeWidth={2}
            dot={false}
            name="Cumulative avoided emissions"
          />

          <Legend
            verticalAlign="bottom"
            height={36}
            content={({ payload }) => (
              <div className="flex flex-wrap gap-4 justify-center items-center text-xs">
                {payload?.map((entry: any, index: number) => (
                  <div key={`item-${index}`} className="flex items-center gap-2">
                    {entry.type === "line" ? (
                      <div className="w-4 h-0.5" style={{ backgroundColor: entry.color }} />
                    ) : (
                      <div className="w-3 h-3" style={{ backgroundColor: entry.color }} />
                    )}
                    <span>{entry.value}</span>
                  </div>
                ))}
              </div>
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}