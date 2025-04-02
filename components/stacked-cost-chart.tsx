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
import { InfoDialog } from "@/components/ui/info-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StackedBenefitChart } from "./stacked-benefit-chart"

// Color palette harmonized based on system-cost-benefits colors
// Creates a spectrum from warm oranges to cool blues
const COST_VARIABLES = [
  // Warm tones from the "costs" palette (oranges/reds)
  { id: "cost_battery_grid", name: "Grid Battery", color: "#e65c1a" },
  { id: "cost_battery_long", name: "Long-term Battery", color: "#ff7c43" },
  { id: "cost_battery_pe", name: "PE Battery", color: "#ff9e6d" },
  { id: "cost_battery_short", name: "Short-term Battery", color: "#ffbd59" },
  { id: "opportunity_cost", name: "Opportunity", color: "#ffd29c" },
  
  // Worker-related costs using greenish colors
  { id: "worker_compensation_cost", name: "Worker Compensation", color: "#b3de69" },
  { id: "worker_retraining_cost", name: "Worker Retraining", color: "#d4e79e" },
  
  // Cool tones from the "benefits" palette (blues)
  { id: "solar_cost", name: "Solar", color: "#80d3e8" },
  { id: "wind_offshore_cost", name: "Wind Offshore", color: "#48cae4" },
  { id: "wind_onshore_cost", name: "Wind Onshore", color: "#00b4d8" },
  { id: "geothermal_cost", name: "Geothermal", color: "#0096c7" },
  { id: "hydropower_cost", name: "Hydropower", color: "#0077b6" },
]

// Default GDP value to use if data fetch fails
const DEFAULT_GDP = 1.0; // Trillion USD

const FIGURE_NOTES = `In this Figure, the breakdown of the decarbonization costs of EMDEs as a whole and eight countries with large power sector emissions (i.e., India, USA, Indonesia, Vietnam, Türkiye, Germany, Poland, and Kazakhstan) are displayed, for both the time horizon to 2035 and the time horizon to 2050. Country costs of decarbonization consist of (i) the opportunity costs to phase out fossil fuel power plants early (i.e., the stranded asset value of a power plant (defined as the expected discounted value of future missed cashflows of the power plant resulting from closing it down early according to NGFS NZ2050-1.5°C-50% decarbonization scenario relative to free cashflows earned in the NGFS GCAM6.0 Current Policy scenario), the compensation to power plant workers for missed wages; and retraining cost); the (ii) investment costs in renewable power plants (plus supporting short- and long-duration energy storage and grid extensions) to replace the fossil fuel power plants that are closed early keep up with any growth in electricity demand. 

The cost components include worker compensation for missed wages and worker retraining costs, which are considered part of the just transition costs to ensure that fossil fuel workers are not left behind in the clean energy transition.

Here we assume that each country, and EMDEs as a whole, pays for all its decarbonization costs (i.e., no foreign climate finance offerings or private sector co-payment). For each country, and for EMDEs as a whole, we assume decarbonization occurs via a decarbonization pathway in line with the NGFS NZ2050-1.5°C-50% decarbonization scenario. We use the NGFS GCAM6.0 Current Policy scenario to project electricity demand, for each fossil fuel power plant type, in each country, under business-as-usual.`

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
  const [useBillions, setUseBillions] = useState<boolean>(false)

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
        
        // Determine if we should use billions instead of trillions for display
        // Find maximum cost across all years
        const maxCost = Math.max(...dataWithGdp.map((year: any) => year.totalCost));
        setUseBillions(maxCost < 0.1);
        
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

  // Format values based on whether using billions or trillions
  const formatValue = (value: number, detailed: boolean = false): string => {
    if (value === 0) return "0";
    
    if (useBillions) {
      // Convert to billions
      const valueInBillions = value * 1000;
      if (detailed) {
        if (valueInBillions < 0.001) return valueInBillions.toExponential(1) + "B";
        if (valueInBillions < 0.01) return valueInBillions.toFixed(3) + "B";
        if (valueInBillions < 0.1) return valueInBillions.toFixed(2) + "B";
        if (valueInBillions < 10) return valueInBillions.toFixed(1) + "B";
        return Math.round(valueInBillions) + "B";
      } else {
        return valueInBillions.toFixed(2) + "B";
      }
    } else {
      // Use trillions
      if (detailed) {
        if (value < 0.001) return value.toExponential(1) + "T";
        if (value < 0.01) return value.toFixed(3) + "T";
        if (value < 0.1) return value.toFixed(2) + "T";
        if (value < 1) return value.toFixed(2) + "T";
        if (value < 10) return value.toFixed(1) + "T";
        return Math.round(value) + "T";
      } else {
        return value.toFixed(2) + "T";
      }
    }
  };

  // Custom tooltip that shows total cost and GDP percentage
  const CustomTooltip = (props: any) => {
    const { active, payload, label } = props;
  
    if (active && payload && payload.length) {
      // Find the data for this year to get totalCost and gdpPercentage
      const yearData = data.find(item => item.year === label);
      
      if (!yearData) return null;
      
      const totalCostDisplay = formatValue(yearData.totalCost);
      const gdpPercentageDisplay = yearData.gdpPercentage.toFixed(2);
      
      // Calculate total battery and opportunity costs
      const batteryAndOpportunityCosts = COST_VARIABLES
        .filter(v => v.id.startsWith('cost_battery_') || v.id === 'opportunity_cost' || v.id === 'worker_compensation_cost' || v.id === 'worker_retraining_cost')
        .reduce((sum, v) => sum + (yearData[v.id] || 0), 0);
      
      // Calculate total renewable costs
      const renewableCosts = COST_VARIABLES
        .filter(v => v.id.endsWith('_cost') && !v.id.startsWith('cost_battery_') && v.id !== 'opportunity_cost' && v.id !== 'worker_compensation_cost' && v.id !== 'worker_retraining_cost')
        .reduce((sum, v) => sum + (yearData[v.id] || 0), 0);
      
      return (
        <div style={tooltipStyle}>
          <p style={tooltipLabelStyle}>Year: {label}</p>
          <p style={{ ...tooltipItemStyle, fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '4px' }}>
            Total Cost: {totalCostDisplay} USD ({gdpPercentageDisplay}% of GDP)
          </p>
          <p style={{ ...tooltipItemStyle, fontWeight: 'bold', color: '#ff7c43' }}>
            Battery, Opportunity & Worker Costs: {formatValue(batteryAndOpportunityCosts)} USD
          </p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'gdpPercentage') return null;
            
            // Calculate percentage of total cost
            const percentage = ((entry.value / yearData.totalCost) * 100).toFixed(1);
            
            return (
              <p key={`item-${index}`} style={tooltipItemStyle}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: entry.color, marginRight: '5px' }}></span>
                {entry.name}: {formatValue(entry.value)} USD ({percentage}%)
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
      router.push(`/downloads/stacked-data?type=cost&country=${country}`);
    } else {
      // Redirect to login page with return URL
      router.push(`/login?returnTo=/downloads/stacked-data?type=cost&country=${country}`);
    }
  }

  if (isLoading) {
    return (
      <Card className={cn("dark:bg-[#2F3A2F] flex flex-col h-[650px]", className)}>
        <CardHeader className="flex-none pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle>Aggregated Variables Over Time</CardTitle>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
              <Button variant="outline" onClick={handleDownload} size="sm" className="h-8">
                <Download className="mr-2 h-4 w-4" />
                Download Data
              </Button>
              <InfoDialog>
                <p className="whitespace-pre-line">
                  {FIGURE_NOTES}
                </p>
              </InfoDialog>
            </div>
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
      <Card className={cn("dark:bg-[#2F3A2F] flex flex-col h-[650px]", className)}>
        <CardHeader className="flex-none pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle>Aggregated Variables Over Time</CardTitle>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
              <Button variant="outline" onClick={handleDownload} size="sm" className="h-8">
                <Download className="mr-2 h-4 w-4" />
                Download Data
              </Button>
              <InfoDialog>
                <p className="whitespace-pre-line">
                  {FIGURE_NOTES}
                </p>
              </InfoDialog>
            </div>
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
    <Card className={cn("dark:bg-[#2F3A2F] flex flex-col h-[650px]", className)}>
      <CardHeader className="flex-none pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle>Aggregated Variables Over Time</CardTitle>
          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
            <Button variant="outline" onClick={handleDownload} size="sm" className="h-8">
              <Download className="mr-2 h-4 w-4" />
              Download Data
            </Button>
            <InfoDialog>
              <p className="whitespace-pre-line">
                {FIGURE_NOTES}
              </p>
            </InfoDialog>
          </div>
        </div>
        <CardDescription>Cost and benefit components from 2025 to 2050 - {COUNTRY_NAMES[country]} (SCC 190 USD and NGFS Scenarios)</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <Tabs defaultValue="cost" className="w-full h-full flex flex-col">
          <div className="px-2 sm:px-4 md:px-6">
            <TabsList className="w-full sm:w-[300px] md:w-[400px] grid grid-cols-2 mb-2">
              <TabsTrigger value="cost">Cost Variables</TabsTrigger>
              <TabsTrigger value="benefit">Benefit Variables</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="cost" className="flex-1 min-h-0">
            <div className="w-full h-full flex flex-col px-2 sm:px-4 md:px-6">
              <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-1 gap-y-0.5 sm:gap-2 mb-1 sm:mb-2 max-h-[100px] xs:max-h-none overflow-y-auto">
                {COST_VARIABLES.map((variable) => (
                  <div key={variable.id} className="flex items-center space-x-1 min-h-[18px]">
                    <Checkbox
                      id={`variable-${variable.id}`}
                      checked={visibleVariables.includes(variable.id)}
                      onCheckedChange={() => toggleVariable(variable.id)}
                      className="h-3 w-3"
                    />
                    <Label htmlFor={`variable-${variable.id}`} className="text-[10px] xs:text-xs flex items-center truncate">
                      <div className="w-2 h-2 mr-1 rounded-sm flex-shrink-0" style={{ backgroundColor: variable.color }} />
                      {variable.name}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="w-full h-[calc(100%-3.5rem)]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data} 
                    margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                    stackOffset="none"
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: theme === "dark" ? "#ffffff" : "#000000", fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={40}
                      tickMargin={10}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="left"
                      label={{
                        value: useBillions ? "Cost (Billion USD)" : "Cost (Trillion USD)",
                        angle: -90,
                        position: "insideLeft",
                        fill: theme === "dark" ? "#ffffff" : "#000000",
                        offset: 0,
                        fontSize: 11
                      }}
                      tick={{ fill: theme === "dark" ? "#ffffff" : "#000000", fontSize: 10 }}
                      tickMargin={5}
                      width={45}
                      domain={[0, 'dataMax']} 
                      allowDataOverflow={false}
                      allowDecimals={true}
                      minTickGap={5}
                      tickFormatter={(value) => {
                        if (useBillions) {
                          // Convert to billions for display
                          const valueInBillions = value * 1000;
                          if (valueInBillions === 0) return "0";
                          if (valueInBillions < 0.001) return valueInBillions.toExponential(1);
                          if (valueInBillions < 0.01) return valueInBillions.toFixed(3);
                          if (valueInBillions < 0.1) return valueInBillions.toFixed(2);
                          if (valueInBillions < 1) return valueInBillions.toFixed(2);
                          if (valueInBillions < 10) return valueInBillions.toFixed(1);
                          return Math.round(valueInBillions).toString();
                        } else {
                          // Use trillions
                          if (value === 0) return "0";
                          if (value < 0.001) return value.toExponential(1);
                          if (value < 0.01) return value.toFixed(3);
                          if (value < 0.1) return value.toFixed(2);
                          if (value < 1) return value.toFixed(2);
                          if (value < 10) return value.toFixed(1);
                          return Math.round(value).toString();
                        }
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      label={{
                        value: "% of GDP",
                        angle: 90,
                        position: "insideRight",
                        fill: theme === "dark" ? "#ffffff" : "#000000",
                        offset: 0,
                        fontSize: 11
                      }}
                      tick={{ fill: theme === "dark" ? "#ffffff" : "#000000", fontSize: 10 }}
                      tickMargin={10}
                      tickFormatter={(value) => `${value < 10 ? value.toFixed(1) : Math.round(value)}%`}
                      dataKey="gdpPercentage"
                      domain={[0, 'dataMax']}
                      allowDataOverflow={false}
                      allowDecimals={true}
                      minTickGap={5}
                      width={60}
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
            </div>
          </TabsContent>
          <TabsContent value="benefit" className="flex-1 min-h-0">
            <StackedBenefitChart country={country} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

