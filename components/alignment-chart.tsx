"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Area, ComposedChart } from "recharts"
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
  disclosedTarget: "#8884d8",
  below2C: "#80b1d3",
  global15C: "#fb8072"
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
        <CardHeader className="flex-none pb-2">
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
        <CardHeader className="flex-none pb-2">
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
  
  // Show ticks at 5-year intervals
  const ticks = [];
  for (let year = Math.ceil(minYear / 5) * 5; year <= maxYear; year += 5) {
    ticks.push(year.toString());
  }
  // Ensure first and last years are included
  if (!ticks.includes(minYear.toString())) {
    ticks.unshift(minYear.toString());
  }
  if (!ticks.includes(maxYear.toString())) {
    ticks.push(maxYear.toString());
  }

  // Custom legend formatter for the lines only
  const renderLegendIcon = (value: string, entry: any) => {
    const { color } = entry;
    
    if (value === "Asset-based Pathway") {
      // For solid line
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginRight: 5 }}>
          <line x1="0" y1="7" x2="14" y2="7" stroke={color} strokeWidth="2" />
        </svg>
      );
    } else if (value === "Disclosed Target") {
      // For dashed line
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginRight: 5 }}>
          <line x1="0" y1="7" x2="14" y2="7" stroke={color} strokeWidth="2" strokeDasharray="2 2" />
        </svg>
      );
    }
    return null;
  };

  // Custom tooltip formatter with matching legend icons
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={tooltipStyle}>
          <p style={tooltipLabelStyle}>Year: {label}</p>
          {payload.map((entry: any, index: number) => {
            let color;
            let icon;
            
            switch(entry.name) {
              case "Asset-based Pathway":
                color = COLORS.assetPathway;
                icon = (
                  <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginRight: 5 }}>
                    <line x1="0" y1="7" x2="14" y2="7" stroke={color} strokeWidth="2" />
                  </svg>
                );
                break;
              case "Disclosed Target":
                color = COLORS.disclosedTarget;
                icon = (
                  <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginRight: 5 }}>
                    <line x1="0" y1="7" x2="14" y2="7" stroke={color} strokeWidth="2" strokeDasharray="2 2" />
                  </svg>
                );
                break;
              case "Below 2°C Global":
                color = COLORS.below2C;
                icon = (
                  <div 
                    style={{ 
                      width: 14, 
                      height: 14, 
                      backgroundColor: color, 
                      opacity: 0.2, 
                      marginRight: 5,
                      display: 'inline-block'
                    }}
                  />
                );
                break;
              case "1.5°C Global":
                color = COLORS.global15C;
                icon = (
                  <div 
                    style={{ 
                      width: 14, 
                      height: 14, 
                      backgroundColor: color, 
                      opacity: 0.2, 
                      marginRight: 5,
                      display: 'inline-block'
                    }}
                  />
                );
                break;
              default:
                color = "#999";
                icon = null;
            }
            
            return (
              <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                {icon}
                <p style={{...tooltipItemStyle, color: theme === "dark" ? "white" : "black"}}>
                  <span style={{fontWeight: 500, color}}>{entry.name}: </span>
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
      <CardHeader className="flex-none pb-3">
        <CardTitle className="flex items-center justify-between">
          Emission Intensity Transition Alignment
          <InfoDialog>
            <p>{FIGURE_NOTES}</p>
          </InfoDialog>
        </CardTitle>
        <CardDescription>
          Metric tonnes of CO₂ per MWh electricity generation - {COUNTRY_NAMES[country]}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-4 pb-3">
        <div className="flex-grow w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={240}>
            <ComposedChart data={data} margin={{ top: 15, right: 15, left: 15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBelow2C" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.below2C} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS.below2C} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="color15C" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.global15C} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS.global15C} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="Year" 
                style={axisStyle}
                tickLine={{ stroke: "rgb(156 163 175)" }}
                axisLine={{ stroke: "rgb(156 163 175)" }}
                tick={{ fontSize: 11 }}
                ticks={ticks}
                allowDataOverflow={false}
                height={35}
              />
              <YAxis 
                domain={[0, 0.8]} 
                style={axisStyle}
                tickLine={{ stroke: "rgb(156 163 175)" }}
                axisLine={{ stroke: "rgb(156 163 175)" }}
                tickFormatter={(value) => value.toFixed(1)}
                tick={{ fontSize: 11 }}
                width={35}
                label={{ 
                  value: "Emission Intensity", 
                  angle: -90, 
                  position: 'insideLeft',
                  style: {
                    textAnchor: 'middle',
                    fill: "rgb(156 163 175)",
                    fontSize: 11,
                    fontWeight: 500
                  },
                  offset: -5
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Area for Below 2°C Global - no stroke */}
              <Area 
                type="monotone" 
                dataKey="Below 2°C Global" 
                fill="url(#colorBelow2C)" 
                stroke="none"
                fillOpacity={1} 
                name="Below 2°C Global"
                isAnimationActive={false}
                activeDot={false}
                dot={false}
                legendType="none"
              />
              
              {/* Area for 1.5°C Global - no stroke */}
              <Area 
                type="monotone" 
                dataKey="1.5°C Global" 
                fill="url(#color15C)" 
                stroke="none"
                fillOpacity={1} 
                name="1.5°C Global"
                isAnimationActive={false}
                activeDot={false}
                dot={false}
                legendType="none"
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
                activeDot={{ r: 5, fill: COLORS.assetPathway }}
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
                activeDot={{ r: 5, fill: COLORS.disclosedTarget }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Responsive custom legend that can break into two rows when needed */}
        <div className="flex flex-wrap justify-center mt-1">
          <div className="flex gap-5 mx-2 mb-1">
            <div className="flex items-center">
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginRight: 5 }}>
                <line x1="0" y1="7" x2="14" y2="7" stroke={COLORS.assetPathway} strokeWidth="2" />
              </svg>
              <span style={{ color: "rgb(156 163 175)", fontSize: 12 }}>Asset-based Pathway</span>
            </div>
            <div className="flex items-center">
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginRight: 5 }}>
                <line x1="0" y1="7" x2="14" y2="7" stroke={COLORS.disclosedTarget} strokeWidth="2" strokeDasharray="2 2" />
              </svg>
              <span style={{ color: "rgb(156 163 175)", fontSize: 12 }}>Disclosed Target</span>
            </div>
          </div>
          <div className="flex gap-5 mx-2 mb-1">
            <div className="flex items-center">
              <div 
                style={{ 
                  width: 14, 
                  height: 14, 
                  background: `linear-gradient(to bottom, ${COLORS.below2C}4D, ${COLORS.below2C}0D)`,
                  marginRight: 5 
                }}
              />
              <span style={{ color: "rgb(156 163 175)", fontSize: 12 }}>Below 2°C Global</span>
            </div>
            <div className="flex items-center">
              <div 
                style={{ 
                  width: 14, 
                  height: 14, 
                  background: `linear-gradient(to bottom, ${COLORS.global15C}4D, ${COLORS.global15C}0D)`,
                  marginRight: 5 
                }}
              />
              <span style={{ color: "rgb(156 163 175)", fontSize: 12 }}>1.5°C Global</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 