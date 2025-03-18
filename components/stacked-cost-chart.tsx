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
import { convertToIso3 } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Color palette harmonized based on system-cost-benefits colors
// Creates a spectrum from warm oranges to cool blues
const COST_VARIABLES = [
  // Warm tones from the "costs" palette (oranges/reds)
  { id: "cost_battery_grid", name: "Grid Battery", color: "#ff7c43" },
  { id: "cost_battery_long", name: "Long-term Battery", color: "#ffa600" },
  { id: "cost_battery_pe", name: "PE Battery", color: "#ff9e6d" },
  { id: "cost_battery_short", name: "Short-term Battery", color: "#ffbd59" },
  { id: "opportunity_cost", name: "Opportunity", color: "#ffd29c" },
  
  // Cool tones from the "benefits" palette (blues)
  { id: "solar_cost", name: "Solar", color: "#80d3e8" },
  { id: "wind_offshore_cost", name: "Wind Offshore", color: "#48cae4" },
  { id: "wind_onshore_cost", name: "Wind Onshore", color: "#00b4d8" },
  { id: "geothermal_cost", name: "Geothermal", color: "#0096c7" },
  { id: "hydropower_cost", name: "Hydropower", color: "#0077b6" },
]

// Default GDP value to use if data fetch fails
const DEFAULT_GDP = 1.0; // Trillion USD

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
  const [gdpValue, setGdpValue] = useState<number>(DEFAULT_GDP)
  const { theme } = useTheme()
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  // Fetch GDP data first
  useEffect(() => {
    const fetchGdpData = async () => {
      try {
        const iso3Code = convertToIso3(country)
        console.log(`Fetching GDP data for country code: ${country} (ISO3: ${iso3Code})`)
        const response = await fetch('/api/country-info')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const allCountryData = await response.json()
        
        if (!Array.isArray(allCountryData)) {
          console.error('Unexpected data format:', allCountryData)
          throw new Error('Received invalid data format from API')
        }
        
        const countryData = allCountryData.find((c: any) => c.Country_ISO3 === iso3Code)
        console.log('Found country data:', countryData ? 
          { 
            country: countryData.Country, 
            iso3: countryData.Country_ISO3,
            gdp: countryData.GDP_2023,
            gdpShare: countryData.GDP_Share_2023
          } : 'Not found')
        
        if (countryData && countryData.GDP_2023) {
          // Looking at the country-info component, GDP is displayed as:
          // ${data.GDP_2023 ? `${(data.GDP_2023 / 1000000000).toFixed(2)}B` : 'N/A'}
          // This means GDP_2023 is likely in dollars, not billions
          
          // Convert GDP from dollars to trillions
          const gdpInTrillions = countryData.GDP_2023 / 1000000000000;
          
          console.log(`GDP for ${countryData.Country} (${iso3Code}): $${gdpInTrillions.toFixed(2)}T`)
          setGdpValue(gdpInTrillions)
        } else {
          console.warn(`No GDP data found for ${country}, using default value`)
          setGdpValue(DEFAULT_GDP)
        }
      } catch (error) {
        console.error('Error fetching GDP data:', error)
        // Use default GDP value if there's an error
        setGdpValue(DEFAULT_GDP)
      }
    }
    
    fetchGdpData()
  }, [country])

  // Fetch cost data after GDP is loaded
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Use the API route instead of direct fetching
        const response = await fetch(`/api/cost-variables?country=${country}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.error) {
          throw new Error(result.error)
        }
        
        // Add GDP percentage data to each year
        const dataWithGdp = result.data.map((yearData: any) => {
          // Calculate the total cost for this year
          const totalCost = COST_VARIABLES.reduce((sum, variable) => {
            // Ensure no negative values
            const value = yearData[variable.id] || 0;
            return sum + Math.max(0, value); // Only add positive values
          }, 0)
          
          // Calculate as percentage of GDP (cost is in trillions, GDP is in trillions)
          const gdpPercentage = (totalCost / gdpValue) * 100
          
          // Create final year data with no negative values
          const yearDataWithoutNegatives = { ...yearData };
          
          // Ensure all cost variables are non-negative
          COST_VARIABLES.forEach(variable => {
            yearDataWithoutNegatives[variable.id] = Math.max(0, yearData[variable.id] || 0);
          });
          
          return {
            ...yearDataWithoutNegatives,
            gdpPercentage: parseFloat(gdpPercentage.toFixed(2)),
            totalCost: parseFloat(totalCost.toFixed(4))
          }
        })
        
        setData(dataWithGdp)
      } catch (e: any) {
        console.error("Error fetching cost variables data:", e)
        setError(e.message || "An error occurred while fetching data")
      } finally {
        setIsLoading(false)
      }
    }

    if (gdpValue) {
      fetchData()
    }
  }, [country, gdpValue])

  // Custom tooltip that shows total cost and GDP percentage
  const CustomTooltip = (props: any) => {
    const { active, payload, label } = props;
  
    if (active && payload && payload.length) {
      // Find the data for this year to get totalCost and gdpPercentage
      const yearData = data.find(item => item.year === label);
      
      if (!yearData) return null;
      
      const totalCostDisplay = yearData.totalCost.toFixed(4);
      const gdpPercentageDisplay = yearData.gdpPercentage.toFixed(2);
      
      // Calculate total battery and opportunity costs
      const batteryAndOpportunityCosts = COST_VARIABLES
        .filter(v => v.id.startsWith('cost_battery_') || v.id === 'opportunity_cost')
        .reduce((sum, v) => sum + (yearData[v.id] || 0), 0);
      
      // Calculate total renewable costs
      const renewableCosts = COST_VARIABLES
        .filter(v => v.id.endsWith('_cost') && !v.id.startsWith('cost_battery_') && v.id !== 'opportunity_cost')
        .reduce((sum, v) => sum + (yearData[v.id] || 0), 0);
      
      return (
        <div style={tooltipStyle}>
          <p style={tooltipLabelStyle}>Year: {label}</p>
          <p style={{ ...tooltipItemStyle, fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '4px' }}>
            Total Cost: {totalCostDisplay}T USD ({gdpPercentageDisplay}% of GDP)
          </p>
          <p style={{ ...tooltipItemStyle, fontWeight: 'bold', color: '#ff7c43' }}>
            Battery & Opportunity Costs: {batteryAndOpportunityCosts.toFixed(4)}T USD
          </p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'gdpPercentage') return null;
            
            // Calculate percentage of total cost
            const percentage = ((entry.value / yearData.totalCost) * 100).toFixed(1);
            
            return (
              <p key={`item-${index}`} style={tooltipItemStyle}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: entry.color, marginRight: '5px' }}></span>
                {entry.name}: {entry.value.toFixed(4)}T USD ({percentage}%)
              </p>
            );
          })}
        </div>
      );
    }
  
    return null;
  };

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
          <CardDescription>Error loading data for {COUNTRY_NAMES[country] || country}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center text-destructive">
          <p className="text-center mb-4">{error || "Failed to load data. Please try again later."}</p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Retry
          </Button>
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
        <CardDescription>Cost components from 2025 to 2050 - {COUNTRY_NAMES[country]} (Values in Trillion USD and % of GDP)</CardDescription>
        {gdpValue === DEFAULT_GDP && (
          <div className="mt-1 text-xs text-amber-500 dark:text-amber-400">
            Note: Using estimated GDP data. GDP percentages may not be accurate.
          </div>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {COST_VARIABLES.map((variable) => (
            <div key={variable.id} className="flex items-center space-x-1">
              <Checkbox
                id={`variable-${variable.id}`}
                checked={visibleVariables.includes(variable.id)}
                onCheckedChange={() => toggleVariable(variable.id)}
                className="h-3 w-3"
              />
              <Label htmlFor={`variable-${variable.id}`} className="text-xs flex items-center">
                <div className="w-2 h-2 mr-1 rounded-sm" style={{ backgroundColor: variable.color }} />
                {variable.name}
              </Label>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              margin={{ top: 10, right: 50, left: 20, bottom: 40 }}
              stackOffset="none"
            >
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
                yAxisId="left"
                label={{
                  value: "Cost (Trillion USD)",
                  angle: -90,
                  position: "insideLeft",
                  fill: theme === "dark" ? "#ffffff" : "#000000",
                  offset: -10,
                }}
                tick={{ fill: theme === "dark" ? "#ffffff" : "#000000" }}
                tickMargin={10}
                domain={[0, 'dataMax']} 
                allowDataOverflow={false}
                allowDecimals={true}
                minTickGap={5}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{
                  value: "% of GDP",
                  angle: 90,
                  position: "insideRight",
                  fill: theme === "dark" ? "#ffffff" : "#000000",
                  offset: -10,
                }}
                tick={{ fill: theme === "dark" ? "#ffffff" : "#000000" }}
                tickMargin={10}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                dataKey="gdpPercentage"
                domain={[0, 'dataMax']}
                allowDataOverflow={false}
                allowDecimals={true}
                minTickGap={5}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" }} />
              {COST_VARIABLES.filter((v) => visibleVariables.includes(v.id)).map((variable) => (
                <Bar 
                  key={variable.id} 
                  dataKey={variable.id} 
                  stackId="a" 
                  fill={variable.color} 
                  name={variable.name}
                  yAxisId="left"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

