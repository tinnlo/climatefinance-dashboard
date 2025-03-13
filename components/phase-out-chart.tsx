"use client"

import { useState, useRef } from "react"
import { useTheme } from "next-themes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts"
import { convertToIso3, iso2ToIso3Map } from "@/lib/utils"
import { Card } from "@/components/ui/card"

// Update scenario values to match the data structure
const scenarios = [
  { value: "maturity", label: "By Power Plant Maturity" },
  { value: "emission_factor", label: "By Power Plant Emission Intensity" },
  { value: "benefits_cost_maturity", label: "By Power Plant Benefits/Costs (Including Plant Maturity)" },
]

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

interface ChartData {
  country_code: string
  country_name: string
  scenarios: {
    [key: string]: PhaseOutData[]
  }
}

export function PhaseOutChart({ country = "in", data }: { country?: string; data: ChartData | null }) {
  const [selectedScenario, setSelectedScenario] = useState("maturity")
  const { theme, systemTheme } = useTheme()
  const chartRef = useRef<HTMLDivElement>(null)

  const currentTheme = theme === "system" ? systemTheme : theme
  const countryCode = convertToIso3(country)
  const countryName = COUNTRY_NAMES[country.toLowerCase()] || countryCode

  // Enhanced debug logging
  console.log('Phase-out Chart Debug:', {
    inputCountry: country,
    convertedCode: countryCode,
    countryName,
    dataExists: !!data,
    scenariosExist: data && !!data.scenarios,
    availableScenarios: data?.scenarios ? Object.keys(data.scenarios) : 'no scenarios',
    selectedScenario,
    scenarioDataExists: data?.scenarios?.[selectedScenario] ? true : false,
    scenarioDataLength: data?.scenarios?.[selectedScenario]?.length || 0,
    firstDataPoint: data?.scenarios?.[selectedScenario]?.[0] || null,
    rawData: data
  })

  const colors = {
    // Bar colors
    Coal: "#0194C5", // Brighter blue
    Gas: "#319B9D", // Teal
    Oil: "#e9c46a", // Yellow

    // Line colors
    annualReduction: "#e63946", // Bright red
    cumulativeFromCurrent: "#457b9d", // Blue
    cumulativeFromBAU: currentTheme === "dark" ? "#a8dadc" : "#1d3557", // Light blue in dark mode, dark blue in light mode

    text: currentTheme === "dark" ? "#ffffff" : "#000000",
    background: currentTheme === "dark" ? "#333333" : "#ffffff",
    tooltipBackground: currentTheme === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.8)",
    tooltipBorder: currentTheme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
  }

  // Check if data is available for the selected country and scenario
  if (!data || !data.scenarios || !data.scenarios[selectedScenario] || data.scenarios[selectedScenario].length === 0) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <span className="text-muted-foreground text-lg">
          No phase-out data available for {countryName} ({countryCode}) in the {scenarios.find(s => s.value === selectedScenario)?.label.toLowerCase() || selectedScenario} scenario.
        </span>
      </div>
    )
  }

  const chartData = data.scenarios[selectedScenario].map((item) => ({
    ...item,
    Coal: item.plants_by_subsector.Coal,
    Gas: item.plants_by_subsector.Gas,
    Oil: item.plants_by_subsector.Oil,
    cumulativeBAU: item.cumulative_mtco2 * 1.2,
  }))

  // Calculate summary statistics
  const totalPlants = chartData.reduce((sum, item) => sum + item.n_plants, 0)
  const totalEmissionsReduction = chartData.reduce((sum, item) => sum + item.amount_mtco2, 0)
  const cumulativeEmissionsReduction = chartData[chartData.length - 1]?.cumulative_mtco2 || 0
  const phaseOutPeriod = `${chartData[0]?.year || ''} - ${chartData[chartData.length - 1]?.year || ''}`

  return (
    <Card className="p-2 sm:p-4 bg-[#2F3A2F] dark:bg-[#2F3A2F] border-0">
      <div className="flex justify-between items-center mb-2 sm:mb-4">
        <Select onValueChange={setSelectedScenario} defaultValue={selectedScenario}>
          <SelectTrigger className="w-full md:w-[300px]">
            <SelectValue placeholder="Select a scenario" />
          </SelectTrigger>
          <SelectContent>
            {scenarios.map((scenario) => (
              <SelectItem key={scenario.value} value={scenario.value}>
                {scenario.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Container - Takes up 2/3 of the space on large screens */}
        <div className="lg:col-span-2">
          <div ref={chartRef} className="w-full h-[400px] bg-[#2F3A2F] dark:bg-[#2F3A2F] rounded-lg p-2 sm:p-4">
            <div className="h-[70%] md:h-[75%] lg:h-[92%]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={chartData} 
                  margin={{ 
                    top: 20, 
                    right: 10,
                    left: 0,
                    bottom: 20 
                  }}
                >
                  <XAxis
                    dataKey="year"
                    stroke={colors.text}
                    tickFormatter={(value) => (value % 5 === 0 ? value.toString() : "")}
                    fontSize={12}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke={colors.text}
                    fontSize={12}
                    width={40}
                    label={{
                      value: "Annual Emission Reduction (MtCO2)",
                      angle: -90,
                      position: "insideLeft",
                      fill: colors.text,
                      fontSize: 12,
                      dx: -1,
                      dy: 90,
                      className: "hidden md:block"
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={colors.text}
                    fontSize={12}
                    width={40}
                    label={{
                      value: "Cumulative Avoided Emissions (GtCO2)",
                      angle: 90,
                      position: "insideRight",
                      fill: colors.text,
                      fontSize: 12,
                      dx: 4,
                      dy: 95,
                      className: "hidden md:block"
                    }}
                    tickFormatter={(value) => (value / 1000).toFixed(1)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: currentTheme === "dark" ? "rgba(31, 41, 55, 0.95)" : "rgba(255, 255, 255, 0.95)",
                      border: `1px solid ${currentTheme === "dark" ? "#374151" : "#e5e7eb"}`,
                      borderRadius: "6px",
                      padding: "12px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      zIndex: 1000
                    }}
                    itemStyle={{ color: colors.text, opacity: 0.9 }}
                    labelStyle={{ color: colors.text, fontWeight: 500, marginBottom: "4px" }}
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
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulative_mtco2"
                    stroke={colors.cumulativeFromCurrent}
                    strokeWidth={2}
                    dot={false}
                    name="Cumulative avoided emissions (current)"
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativeBAU"
                    stroke={colors.cumulativeFromBAU}
                    strokeWidth={2}
                    dot={false}
                    name="Cumulative avoided emissions (BAU)"
                    activeDot={{ r: 4 }}
                  />

                  {/* Custom Legend Layout */}
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    content={({ payload }) => (
                      <div className="flex flex-col gap-1 text-xs md:text-sm w-full px-1 md:px-12">
                        <div className="flex flex-row items-center justify-start gap-2 md:gap-4">
                          {payload?.slice(0, 3).map((entry: any, index: number) => (
                            <div key={`item-${index}`} className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 md:w-3 md:h-3" style={{ backgroundColor: entry.color }} />
                              <span className="text-[10px] md:text-xs">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-2">
                          {payload?.slice(3).map((entry: any, index: number) => (
                            <div key={`line-${index}`} className="flex items-center gap-1 md:gap-2">
                              <div
                                className="w-4 h-0.5 flex-shrink-0"
                                style={{
                                  backgroundColor: entry.color,
                                  borderBottom: index === 1 ? "2px dashed" : index === 2 ? "2px dotted" : "none",
                                  borderColor: entry.color,
                                }}
                              />
                              <span className="text-[10px] md:text-xs" title={entry.value}>
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="text-[8px] md:text-[10px] text-muted-foreground flex flex-col">
                          <div>(N) = Number of plants shut down in that year</div>
                          <div>Start Rank → End Rank of plants in phase-out sequence</div>
                        </div>
                      </div>
                    )}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Statistics Summary Container - Takes up 1/3 of the space on large screens */}
        <div className="lg:col-span-1">
          <Card className="p-3 sm:p-4 lg:p-5 bg-[#2F3A2F] dark:bg-[#2F3A2F] border-[#4A5A4A]">
            <h3 className="text-xl font-semibold mb-3">Phase-out Statistics</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Country</p>
                <p className="text-2xl font-medium mt-1">{countryName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phase-out Period</p>
                <p className="text-2xl font-medium mt-1">{phaseOutPeriod}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Plants Affected</p>
                <p className="text-2xl font-medium mt-1">{Math.round(totalPlants)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Emissions Reduction</p>
                <p className="text-2xl font-medium mt-1">{totalEmissionsReduction.toFixed(2)} MtCO2</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cumulative Emissions Reduction</p>
                <p className="text-2xl font-medium mt-1">{(cumulativeEmissionsReduction / 1000).toFixed(2)} GtCO2</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Card>
  )
}