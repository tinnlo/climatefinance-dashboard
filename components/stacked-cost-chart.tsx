"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { COUNTRY_NAMES } from "@/lib/constants"
import { useTheme } from "next-themes"
import { Info, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { convertToIso3 } from "@/lib/utils"
import { InfoDialog } from "@/components/ui/info-dialog"
import { cn } from "@/lib/utils"
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
  // Renewable investments (bottom) - light blue to dark blue
  { id: "hydropower_cost", name: "Hydropower", color: "#0077b6" },
  { id: "geothermal_cost", name: "Geothermal", color: "#0096c7" },
  { id: "wind_onshore_cost", name: "Wind Onshore", color: "#00b4d8" },
  { id: "wind_offshore_cost", name: "Wind Offshore", color: "#48cae4" },
  { id: "solar_cost", name: "Solar", color: "#80d3e8" },
  
  // Grid investments (middle) - green
  { id: "cost_battery_short", name: "Short-term Battery", color: "#e4f8c2" },
  { id: "cost_battery_long", name: "Long-term Battery", color: "#d0ec9a" },
  { id: "cost_battery_pe", name: "Power Electrolyzers", color: "#c2d470" },
  { id: "cost_battery_grid", name: "Grid Extension", color: "#cccd74" },
  
  // Phase-out costs (top) - dark red to light red
  { id: "worker_compensation_cost", name: "Worker Compensation", color: "#d9bc83" },
  { id: "worker_retraining_cost", name: "Worker Retraining", color: "#ff9e6d" },
  { id: "opportunity_cost", name: "Missed Cashflows", color: "#ff7c43" },
]

// Default GDP value to use if data fetch fails
const DEFAULT_GDP = 1.0; // Trillion USD (fallback value)

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
      <li><strong>Economic damage reduction</strong>: Lower economic losses within the country and to the rest of the world, stemming from avoided climate-related damages, productivity losses, and adaptation costs. </li>
      <li><strong>Reduced air pollution damages</strong>: Economic benefits arising from improved air quality and associated health and productivity gains.</li>
    </ol>
    
    <p className="mt-4">
      The <strong>Social Cost of Carbon (SCC)</strong> represents the estimated monetary value of economic damages caused by emitting one metric ton of carbon dioxide. Results are presented using a SCC of <em><strong>190 USD/tCO2</strong></em>– yearly investment need and reduced damages values are undiscounted.
    </p>
  </div>
);

interface StackedCostChartProps {
  className?: string
  country?: string
}

export function StackedCostChart({ className, country = "in" }: StackedCostChartProps) {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
        const gdpResponse = await fetch(`/api/country-info?country=${country}`)
        
        if (!gdpResponse.ok) {
          throw new Error(`HTTP error! status: ${gdpResponse.status}`)
        }
        
        const countryData = await gdpResponse.json()
        
        if (countryData.error) {
          console.error('API error:', countryData.error)
          throw new Error(countryData.error)
        }
        
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
        
        console.log(`Using GDP value of $${gdpValue.toFixed(2)}T for calculations`)
        
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
        
        // Always use billions for display
        setUseBillions(true);
        
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

  // Group cost variables into categories for the tooltip
  const COST_CATEGORIES = [
    {
      name: "Phase-out costs",
      variables: ["opportunity_cost", "worker_retraining_cost", "worker_compensation_cost"]
    },
    {
      name: "Investments into infrastructure",
      variables: ["cost_battery_grid", "cost_battery_pe", "cost_battery_long", "cost_battery_short"]
    },
    {
      name: "Investments into renewables",
      variables: ["solar_cost", "wind_offshore_cost", "wind_onshore_cost", "geothermal_cost", "hydropower_cost"]
    }
  ];

  // Custom tooltip that shows categorized costs with better formatting
  const CustomTooltip = (props: any) => {
    const { active, payload, label } = props;
  
    if (active && payload && payload.length) {
      // Find the data for this year to get totalCost and gdpPercentage
      const yearData = data.find(item => item.year === label);
      
      if (!yearData) return null;
      
      const totalCostDisplay = formatValue(yearData.totalCost);
      const gdpPercentageDisplay = yearData.gdpPercentage.toFixed(2);
      
      // Build a mapping of variable ID to payload entry for easier access
      const variableMap = payload.reduce((map: any, entry: any) => {
        if (entry.dataKey !== 'gdpPercentage') {
          map[entry.dataKey] = entry;
        }
        return map;
      }, {});

      // Calculate totals for each category
      const categoryTotals = COST_CATEGORIES.map(category => {
        const total = category.variables.reduce((sum, varId) => {
          return sum + (yearData[varId] || 0);
        }, 0);
        return {
          name: category.name,
          total: total,
          percentage: (total / yearData.totalCost) * 100
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
            <span style={{...tooltipLabelStyle, fontSize: '14px'}}>{totalCostDisplay} ({gdpPercentageDisplay}% of GDP)</span>
          </div>

          {categoryTotals.map((category, categoryIndex) => (
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
              
              {COST_CATEGORIES[categoryIndex].variables.map((varId, varIndex) => {
                const variable = COST_VARIABLES.find(v => v.id === varId);
                const entry = variableMap[varId];
                
                if (!variable || !entry || entry.value === 0) return null;
                
                // Calculate percentage within this category
                const percentage = (entry.value / category.total) * 100;
                
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
          ))}
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
            <CardTitle>Investment Needs and Reduced Damages over time</CardTitle>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
              <InfoDialog title="Figure Notes">
                <FormattedNotes />
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
            <CardTitle>Investment Needs and Reduced Damages over time</CardTitle>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
              <InfoDialog title="Figure Notes">
                <FormattedNotes />
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
          <CardTitle>Investment Needs and Reduced Damages over time</CardTitle>
          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
            <InfoDialog title="Figure Notes">
              <FormattedNotes />
            </InfoDialog>
          </div>
        </div>
        <CardDescription>Transition Investment Needs and Implied Reduced Damages from 2025 to 2050 (SCC 190 USD) - {COUNTRY_NAMES[country]}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <Tabs defaultValue="cost" className="w-full h-full flex flex-col">
            <div className="px-2 sm:px-4 md:px-6">
              <TabsList className="w-full sm:w-[300px] md:w-[400px] grid grid-cols-2 mb-2">
                <TabsTrigger value="cost">Investment Needs</TabsTrigger>
                <TabsTrigger value="benefit">Reduced Damages</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="cost" className="flex-1 min-h-0">
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
                          value: "Cost (Billion USD)",
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
                          if (valueInBillions === 0) return "0";
                          
                          // Check if all data values are very small
                          const maxValue = Math.max(...data.map(d => {
                            // Calculate total cost for this year
                            return COST_VARIABLES.reduce((sum, variable) => {
                              return sum + Math.max(0, d[variable.id] || 0);
                            }, 0);
                          })) * 1000;
                          
                          // For very small datasets (max < 1 billion), use appropriate decimal places
                          if (maxValue < 0.01) return valueInBillions.toFixed(3);
                          if (maxValue < 0.1) return valueInBillions.toFixed(2);
                          if (maxValue < 1) return valueInBillions.toFixed(1);
                          
                          // For regular-sized datasets, use fewer decimal places
                          if (valueInBillions < 0.1) return valueInBillions.toFixed(1);
                          return Math.round(valueInBillions).toString();
                        }}
                        scale="linear"
                        interval="preserveStartEnd"
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
                        tickFormatter={(value) => {
                          // Find max GDP percentage to determine format
                          const maxPercentage = Math.max(...data.map(d => d.gdpPercentage || 0));
                          
                          // For very small percentages, use more decimal places
                          if (maxPercentage < 0.01) return `${value.toFixed(3)}%`;
                          if (maxPercentage < 0.1) return `${value.toFixed(2)}%`;
                          if (maxPercentage < 1) return `${value.toFixed(1)}%`;
                          
                          // Standard formatting for normal ranges
                          return `${value < 10 ? value.toFixed(1) : Math.round(value)}%`;
                        }}
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
                      {COST_VARIABLES.map((variable) => (
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
        </div>
        
        <div className="flex justify-center mt-2 p-4 md:p-6">
          <Button 
            variant="outline" 
            onClick={handleDownload} 
            size="sm"
            className="h-8 text-sm"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Data
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

