"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { COUNTRY_NAMES } from "@/lib/constants"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
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
import { Button } from "@/components/ui/button"

// Color palette for benefit variables
const BENEFIT_VARIABLES = [
  { id: "Coal", name: "Coal", color: "#ff7c43" },
  { id: "Gas", name: "Gas", color: "#ffa600" },
  { id: "Oil", name: "Oil", color: "#ff9e6d" },
  { id: "Reduced Air Pollution", name: "Reduced Air Pollution", color: "#00b4d8" },
]

// Default GDP value to use if data fetch fails
const DEFAULT_GDP = 1.0; // Trillion USD

const FIGURE_NOTES = `In this Figure, the breakdown of the decarbonization benefits of EMDEs as a whole and eight countries with large power sector emissions (i.e., India, USA, Indonesia, Vietnam, Türkiye, Germany, Poland, and Kazakhstan) are displayed, for both the time horizon to 2035 and the time horizon to 2050. Country benefits of decarbonization consist of (i) the benefits from reduced fossil fuel imports (Coal, Gas, and Oil); and (ii) the benefits from reduced air pollution. Here we assume that each country, and EMDEs as a whole, receives all its decarbonization benefits (i.e., no foreign climate finance offerings or private sector co-payment). For each country, and for EMDEs as a whole, we assume decarbonization occurs via a decarbonization pathway in line with the NGFS NZ2050-1.5°C-50% decarbonization scenario.`

interface StackedBenefitChartProps {
  className?: string
  country?: string
}

interface YearData {
  year: string
  gdpPercentage: number
  totalBenefit: number
  [key: string]: number | string // Allow indexing with variable IDs
}

export function StackedBenefitChart({ className, country = "in" }: StackedBenefitChartProps) {
  const [data, setData] = useState<YearData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleVariables, setVisibleVariables] = useState<string[]>(BENEFIT_VARIABLES.map((v) => v.id))
  const [gdpValue, setGdpValue] = useState<number>(DEFAULT_GDP)
  const { theme } = useTheme()
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  // Fetch GDP data first
  useEffect(() => {
    const fetchGdpData = async () => {
      try {
        console.log(`Fetching GDP data for country code: ${country}`)
        const response = await fetch(`/api/system-cost-benefits?country=${country}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('Raw data from API:', result)
        
        if (!result || !result.costs || !Array.isArray(result.costs)) {
          throw new Error('Invalid data format received from API')
        }

        // Calculate total cost and GDP percentage
        const totalCost = result.totalCost || 0
        const costGdpPercentage = result.costGdpPercentage || 0

        // Calculate GDP value from total cost and GDP percentage
        const calculatedGdp = totalCost / (costGdpPercentage / 100)
        console.log('Calculated GDP value:', calculatedGdp)
        
        setGdpValue(calculatedGdp || DEFAULT_GDP)
      } catch (error) {
        console.error('Error fetching GDP data:', error)
        setGdpValue(DEFAULT_GDP)
      }
    }
    
    fetchGdpData()
  }, [country])

  // Fetch benefit data after GDP is loaded
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        console.log('Starting to fetch benefit data...')
        console.log('Using country code for API request:', country)
        
        const response = await fetch(`/api/benefit-variables?country=${country}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('API response:', result)
        
        if (result.error) {
          throw new Error(result.error)
        }

        if (!result.data || !Array.isArray(result.data)) {
          throw new Error(`Invalid data format received from API`)
        }

        // Add GDP percentages to each year's data
        const transformedData = result.data.map((yearData: YearData) => {
          // Get available benefit types for this year's data
          const availableBenefits = BENEFIT_VARIABLES.filter(variable => 
            typeof yearData[variable.id] === 'number'
          )

          // Calculate total benefit using only available benefit types
          const totalBenefit = availableBenefits.reduce((sum, variable) => {
            const value = yearData[variable.id]
            return sum + (typeof value === 'number' ? value : 0)
          }, 0)
          
          // Calculate as percentage of GDP
          const gdpPercentage = gdpValue > 0 ? (totalBenefit / gdpValue) * 100 : 0
          
          // Ensure all benefit variables have at least a 0 value
          const yearDataWithDefaults = { ...yearData }
          BENEFIT_VARIABLES.forEach(variable => {
            if (typeof yearDataWithDefaults[variable.id] !== 'number') {
              yearDataWithDefaults[variable.id] = 0
            }
          })
          
          return {
            ...yearDataWithDefaults,
            gdpPercentage: parseFloat(gdpPercentage.toFixed(2)),
            totalBenefit: parseFloat(totalBenefit.toFixed(4))
          }
        })
        
        // Update visible variables to only show those that have data
        const availableBenefitTypes = BENEFIT_VARIABLES.filter(variable =>
          transformedData.some((yearData: YearData) => {
            const value = yearData[variable.id]
            return typeof value === 'number' && value > 0
          })
        ).map(v => v.id)
        
        setVisibleVariables(availableBenefitTypes)
        console.log('Available benefit types:', availableBenefitTypes)
        console.log('Final transformed data:', transformedData)
        setData(transformedData)
      } catch (e: any) {
        console.error("Error fetching benefit data:", e)
        console.error("Error stack:", e.stack)
        setError(e.message || "An error occurred while fetching data")
      } finally {
        setIsLoading(false)
      }
    }

    if (gdpValue) {
      console.log('GDP value available:', gdpValue)
      fetchData()
    } else {
      console.log('Waiting for GDP value...')
    }
  }, [country, gdpValue])

  // Custom tooltip that shows total benefit and GDP percentage
  const CustomTooltip = (props: any) => {
    const { active, payload, label } = props;
  
    if (active && payload && payload.length) {
      // Find the data for this year to get totalBenefit and gdpPercentage
      const yearData = data.find(item => item.year === label);
      
      if (!yearData) return null;
      
      const totalBenefitDisplay = yearData.totalBenefit.toFixed(4);
      const gdpPercentageDisplay = yearData.gdpPercentage.toFixed(2);
      
      return (
        <div style={tooltipStyle}>
          <p style={tooltipLabelStyle}>Year: {label}</p>
          <p style={{ ...tooltipItemStyle, fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '4px' }}>
            Total Benefit: {totalBenefitDisplay}T USD ({gdpPercentageDisplay}% of GDP)
          </p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'gdpPercentage') return null;
            
            // Calculate percentage of total benefit
            const percentage = ((entry.value / yearData.totalBenefit) * 100).toFixed(1);
            
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
    if (isAuthenticated) {
      router.push(`/downloads/stacked-data?type=benefit&country=${country}`);
    } else {
      router.push(`/login?returnTo=/downloads/stacked-data?type=benefit&country=${country}`);
    }
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-destructive">
        <p className="text-center mb-4">{error || "Failed to load data. Please try again later."}</p>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col px-6">
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
        {BENEFIT_VARIABLES.filter(variable => 
          data.some((yearData: YearData) => {
            const value = yearData[variable.id]
            return typeof value === 'number' && value > 0
          })
        ).map((variable) => (
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
      <div className="w-full h-[calc(100%-2rem)]">
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
                value: "Benefit (Trillion USD)",
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
              tickFormatter={(value) => {
                if (value === 0) return "0";
                if (value < 0.001) return value.toExponential(1);
                if (value < 0.01) return value.toFixed(3);
                if (value < 0.1) return value.toFixed(2);
                if (value < 1) return value.toFixed(2);
                if (value < 10) return value.toFixed(1);
                return Math.round(value).toString();
              }}
              width={60}
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
              tickFormatter={(value) => `${value < 10 ? value.toFixed(1) : Math.round(value)}%`}
              dataKey="gdpPercentage"
              domain={[0, 'dataMax']}
              allowDataOverflow={false}
              allowDecimals={true}
              minTickGap={5}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" }} />
            {BENEFIT_VARIABLES.filter((v) => visibleVariables.includes(v.id)).map((variable) => (
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
  )
} 