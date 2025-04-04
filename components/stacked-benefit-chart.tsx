"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { COUNTRY_NAMES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
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
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

// Color palette for benefit variables
const BENEFIT_VARIABLES = [
  { id: "Coal", name: "Coal", color: "#ff7c43" },
  { id: "Gas", name: "Gas", color: "#ffa600" },
  { id: "Oil", name: "Oil", color: "#ffd29c" },
  { id: "Reduced Air Pollution", name: "Reduced Air Pollution", color: "#00b4d8" },
]

// Default GDP value to use if data fetch fails
const DEFAULT_GDP = 1.0; // Trillion USD

// Formatted notes with proper styling
const FormattedNotes = () => (
  <div className="prose prose-sm dark:prose-invert max-w-none">
    <p>
      This figure illustrates the estimated <strong>transition investment needs</strong> and the <strong>implied reduction in economic damages</strong> for countries to achieve alignment with their respective net-zero transition plans and targets, as stipulated in the scenario pathways provided by the <a href="https://www.ngfs.net/ngfs-scenarios-portal/explore/" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">Network for Greening the Financial System (NGFS)</a>.
    </p>
    
    <h3 className="text-lg font-semibold mt-4 mb-2">Transition investment needs</h3>
    <p>are categorized into three distinct components:</p>
    
    <ol className="list-decimal pl-5 my-2 space-y-1">
      <li><strong>Phase-out costs</strong>: The costs associated with the early retirement of fossil fuel power plants, ahead of their initially planned lifetimes. The cost components are (i) the stranded asset value of the phased-out power plants (defined as the expected discounted value of future missed cashflows of power plants resulting from closing it down early relative to expected free cashflows earned if the plants would be left operational until the end of their lifetime), (ii) the compensation to power plant workers for missed wages and (iii) the retraining cost of said workers.</li>
      <li><strong>Investments into renewables</strong>: The investments required to deploy renewable power generation capacity to replace the phased-out fossil fuel capacity. The relevant renewable technologies are solar, wind (offshore and onshore), hydropower and geothermal.</li>
      <li><strong>Investments into infrastructure</strong>: The investments required to expanding grid infrastructure, developing electricity storage capacity, and deploying other supporting technologies necessary to integrate renewable generation. The relevant infrastructure technologies are (I )electricity grids, (ii) short-term batteries (i.e. Li-ion batteries), (iii) long-term batteries (i.e., green hydrogen produced through electrolysis powered by renewables) and (iv) power electrolyzers.</li>
    </ol>
    
    <h3 className="text-lg font-semibold mt-4 mb-2">The reduced economic damages</h3>
    <p>are categorized into two distinct components:</p>
    
    <ol className="list-decimal pl-5 my-2 space-y-1">
      <li><strong>Economic damage reduction</strong>: Lower economic losses within the country and to the rest of the world, stemming from avoided climate-related damages, productivity losses, and adaptation costs. These components are further divided into the reduced damages from phasing out (i) coal, (ii) oil, and (iii) gas.</li>
      <li><strong>Reduced air pollution damages</strong>: Economic benefits arising from improved air quality and associated health and productivity gains.</li>
    </ol>
    
    <p className="mt-4">
      The <strong>Social Cost of Carbon (SCC)</strong> represents the estimated monetary value of economic damages caused by emitting one metric ton of carbon dioxide. Results are presented using a SCC of <em><strong>190 USD/tCO2</strong></em>– yearly investment need and reduced damages values are undiscounted.
    </p>
  </div>
);

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
  const [gdpValue, setGdpValue] = useState<number>(DEFAULT_GDP)
  const [useBillions, setUseBillions] = useState<boolean>(false)
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
        
        // Always use billions for display
        setUseBillions(true);
        
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

  // Format values based on billions (always)
  const formatValue = (value: number, detailed: boolean = false): string => {
    if (value === 0) return "0";
    
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
  };

  // Group benefit variables into categories for the tooltip
  const BENEFIT_CATEGORIES = [
    {
      name: "Economic damage reduction",
      variables: ["Coal", "Gas", "Oil"]
    },
    {
      name: "Reduced air pollution damages",
      variables: ["Reduced Air Pollution"]
    }
  ];

  // Custom tooltip that shows categorized benefits with better formatting
  const CustomTooltip = (props: any) => {
    const { active, payload, label } = props;
  
    if (active && payload && payload.length) {
      // Find the data for this year to get totalBenefit and gdpPercentage
      const yearData = data.find(item => item.year === label);
      
      if (!yearData) return null;
      
      const totalBenefitDisplay = formatValue(yearData.totalBenefit);
      const gdpPercentageDisplay = yearData.gdpPercentage.toFixed(2);
      
      // Build a mapping of variable ID to payload entry for easier access
      const variableMap = payload.reduce((map: any, entry: any) => {
        if (entry.dataKey !== 'gdpPercentage') {
          map[entry.dataKey] = entry;
        }
        return map;
      }, {});

      // Calculate totals for each category
      const categoryTotals = BENEFIT_CATEGORIES.map(category => {
        const total = category.variables.reduce((sum, varId) => {
          const value = yearData[varId];
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
        return {
          name: category.name,
          total: total,
          percentage: yearData.totalBenefit > 0 ? (total / yearData.totalBenefit) * 100 : 0
        };
      });
      
      return (
        <div style={{
          ...tooltipStyle,
          maxWidth: '280px',
          padding: '10px 15px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            borderBottom: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
            paddingBottom: '8px'
          }}>
            <span style={{...tooltipLabelStyle, fontSize: '14px'}}>Year: {label}</span>
            <span style={{...tooltipLabelStyle, fontSize: '14px'}}>{totalBenefitDisplay} ({gdpPercentageDisplay}% of GDP)</span>
          </div>

          {categoryTotals.map((category, categoryIndex) => {
            if (category.total <= 0) return null;
            
            return (
              <div key={`category-${categoryIndex}`} style={{marginBottom: '8px'}}>
                <div style={{
                  fontWeight: 'bold',
                  fontSize: '13px',
                  marginBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>{category.name} {formatValue(category.total)} ({category.percentage.toFixed(1)}%)</span>
                </div>
                
                {BENEFIT_CATEGORIES[categoryIndex].variables.map((varId, varIndex) => {
                  const variable = BENEFIT_VARIABLES.find(v => v.id === varId);
                  const entry = variableMap[varId];
                  
                  if (!variable || !entry || entry.value === 0) return null;
                  
                  // Calculate percentage within this category
                  const percentage = category.total > 0 ? (entry.value / category.total) * 100 : 0;
                  
                  return (
                    <div key={`var-${varId}`} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      marginLeft: '12px',
                      marginBottom: '2px'
                    }}>
                      <div style={{display: 'flex', alignItems: 'center'}}>
                        <span style={{
                          display: 'inline-block', 
                          width: '8px', 
                          height: '8px', 
                          backgroundColor: variable.color, 
                          marginRight: '6px'
                        }}></span>
                        <span>{variable.name}</span>
                      </div>
                      <div>
                        {formatValue(entry.value)} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                  );
                })}
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
    <div className="w-full h-full flex flex-col px-2 sm:px-4 md:px-6">
      <div className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
                value: "Benefit (Billion USD)",
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
                // Convert to billions for display
                const valueInBillions = value * 1000;
                if (Math.abs(valueInBillions) < 0.0001) return "0";
                if (valueInBillions < 0.01) return valueInBillions.toFixed(3);
                if (valueInBillions < 0.1) return valueInBillions.toFixed(2);
                if (valueInBillions < 1) return valueInBillions.toFixed(2);
                return valueInBillions.toFixed(2);
              }}
              scale="linear"
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
              scale="linear"
              interval="preserveStartEnd"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" }} />
            {BENEFIT_VARIABLES.filter((v) => 
              data.some((yearData: YearData) => {
                const value = yearData[v.id]
                return typeof value === 'number' && value > 0
              })
            ).map((variable) => (
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