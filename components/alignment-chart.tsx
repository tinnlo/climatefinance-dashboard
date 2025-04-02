"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, ComposedChart } from "recharts"
import { cn } from "@/lib/utils"
import { COUNTRY_NAMES } from "@/lib/constants"
import { useTheme } from "next-themes"
import { InfoDialog } from "@/components/ui/info-dialog"

const FIGURE_NOTES = "This visualization shows emission intensity pathways (in metric tonnes of CO₂ per MWh electricity generation) comparing the actual emissions pathway with targets for 1.5°C and 2°C warming scenarios."

interface AlignmentData {
  Emission_Intensity: Record<string, number>;
  Emission_Intensity_Target: Record<string, number>;
}

// Define colors for consistency
const COLORS = {
  assetPathway: "#4caf50",
  disclosedTarget: "#8884d8"
};

export function AlignmentChart({ className, country = "in" }: { className?: string; country?: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    setLoading(true)
    
    // Fetch alignment data from our API endpoint
    fetch(`/api/alignment-data?country=${country}`)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || "Failed to fetch alignment data")
        }
        return res.json()
      })
      .then((data) => {
        setData(data)
      })
      .catch((error) => {
        console.error("Error fetching alignment data:", error)
        setError(error.message)
      })
      .finally(() => setLoading(false))
  }, [country])

  if (loading) {
    return (
      <Card className={cn("dark:bg-[#2F3A2F] flex flex-col", className)}>
        <CardHeader className="flex-none">
          <CardTitle>Emission Intensity Transition Alignment</CardTitle>
          <CardDescription>Loading data for {COUNTRY_NAMES[country]}...</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center min-h-[300px]">
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
      <Card className={cn("dark:bg-[#2F3A2F] flex flex-col", className)}>
        <CardHeader className="flex-none">
          <CardTitle>Emission Intensity Transition Alignment</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center min-h-[200px]">
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  // Get the years to manually create ticks
  const years = data.map(item => parseInt(item.Year));
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  
  // Create a set of specific years to display on the x-axis
  const yearRange = maxYear - minYear;
  const tickInterval = Math.max(10, Math.ceil(yearRange / 5)); // Show ~5 ticks for readability
  
  // Generate the ticks to display
  const ticks = [];
  for (let year = minYear; year <= maxYear; year += tickInterval) {
    ticks.push(year.toString());
  }
  // Ensure the last year is included
  if (!ticks.includes(maxYear.toString())) {
    ticks.push(maxYear.toString());
  }

  // Custom tooltip formatter with matching colors
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={tooltipStyle}>
          <p style={tooltipLabelStyle}>Year: {label}</p>
          {payload.map((entry: any, index: number) => {
            const color = entry.name === "Asset-based Pathway" 
              ? COLORS.assetPathway 
              : COLORS.disclosedTarget;
            
            return (
              <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: color, 
                  marginRight: '8px',
                  borderRadius: entry.name === "Disclosed Target" ? '0' : '50%'
                }}></div>
                <p style={{...tooltipItemStyle, color: theme === "dark" ? "white" : "black"}}>
                  <span style={{fontWeight: 500}}>{entry.name}: </span>
                  <span>{entry.value.toFixed(2)}</span>
                </p>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

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
    opacity: 0.9
  }

  const axisStyle = {
    fontSize: "12px",
    fill: "rgb(156 163 175)", // matches text-muted-foreground
    fontWeight: 500,
  }

  return (
    <Card className={cn("dark:bg-[#2F3A2F] flex flex-col h-full", className)}>
      <CardHeader className="flex-none">
        <CardTitle className="flex items-center justify-between">
          Emission Intensity Transition Alignment
          <InfoDialog>
            <p>{FIGURE_NOTES}</p>
          </InfoDialog>
        </CardTitle>
        <CardDescription>
          metric tonnes of CO₂ per MWh electricity generation - {COUNTRY_NAMES[country]}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pb-4">
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={250}>
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <XAxis 
                dataKey="Year" 
                style={axisStyle}
                tickLine={{ stroke: "rgb(156 163 175)" }}
                axisLine={{ stroke: "rgb(156 163 175)" }}
                tick={{ fontSize: 11 }}
                ticks={ticks}
                allowDataOverflow={false}
              />
              <YAxis 
                domain={[0, 0.8]} 
                style={axisStyle}
                tickLine={{ stroke: "rgb(156 163 175)" }}
                axisLine={{ stroke: "rgb(156 163 175)" }}
                tickFormatter={(value) => value.toFixed(1)}
                label={{ 
                  value: "Emission Intensity", 
                  angle: -90, 
                  position: 'insideLeft',
                  style: {
                    textAnchor: 'middle',
                    fill: "rgb(156 163 175)",
                    fontSize: 12,
                    fontWeight: 500
                  }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: 5 }} 
                formatter={(value, entry) => {
                  return <span style={{ color: "rgb(156 163 175)" }}>{value}</span>;
                }}
              />
              
              {/* Line for Asset-based Pathway */}
              <Line 
                type="monotone" 
                dataKey="Asset-based Pathway" 
                stroke={COLORS.assetPathway} 
                strokeWidth={2} 
                dot={false} 
                name="Asset-based Pathway"
                isAnimationActive={false}
                activeDot={{ r: 6, fill: COLORS.assetPathway }}
              />
              
              {/* Line for Disclosed Target */}
              <Line 
                type="monotone" 
                dataKey="Disclosed Target" 
                stroke={COLORS.disclosedTarget} 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                dot={false} 
                name="Disclosed Target"
                isAnimationActive={false}
                activeDot={{ r: 6, fill: COLORS.disclosedTarget }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 