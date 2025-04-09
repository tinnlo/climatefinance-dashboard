"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { COUNTRY_NAMES } from "@/lib/constants"
import { useTheme } from "next-themes"
import { Download, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { InfoDialog } from "@/components/ui/info-dialog"
import { cn } from "@/lib/utils"

// Define the phase-in variables with their mapping to the external data source
const PHASE_IN_VARIABLES = [
  // Renewable technologies 
  { id: "solar", name: "Solar", color: "#e2918f" },  // Pink
  { id: "onshore_wind", name: "Onshore Wind", color: "#e8aa77" },  // Orange
  { id: "offshore_wind", name: "Offshore Wind", color: "#aaaae0" },  // Purple
  { id: "hydropower", name: "Hydropower", color: "#f4d471" },  // Ivory
  { id: "geothermal", name: "Geothermal", color: "#a4bf7f" },  // Green
  
  // Storage technologies 
  { id: "battery_short", name: "Short-term Battery", color: "#a5d7d8" },  // Teal
  { id: "battery_long", name: "Long-term Battery", color: "#629ddd" },  // Blue
]

// Formatted notes with proper styling
const FormattedNotes = () => (
  <div className="prose prose-sm dark:prose-invert max-w-none">
    <p>
      This figure illustrates the estimated <strong>phase-in capacity additions</strong> for countries to achieve alignment with their respective net-zero transition plans and targets, as stipulated in the scenario pathways provided by the <a href="https://www.ngfs.net/ngfs-scenarios-portal/explore/" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">Network for Greening the Financial System (NGFS)</a>.
    </p>
    
    <h3 className="text-lg font-semibold mt-4 mb-2">Phase-in capacity</h3>
    <p>represents the installed capacity (in GW) required to transition to clean energy and is categorized into two main components:</p>
    
    <ol className="list-decimal pl-5 my-2 space-y-1">
      <li><strong>Renewable energy deployment</strong>: New capacity in renewable power generation including solar, wind (offshore and onshore), hydropower, and geothermal.</li>
      <li><strong>Energy storage systems</strong>: New capacity in both short-term and long-term energy storage technologies to facilitate the integration of renewable energy sources.</li>
    </ol>
    
    <p className="mt-4">
      These capacity additions work in tandem with phase-out plans to ensure a smooth transition to clean energy while maintaining grid stability and meeting energy demand.
    </p>
  </div>
);

interface StackedPhaseInChartProps {
  className?: string
  country?: string
}

export function StackedPhaseInChart({ className, country = "in" }: StackedPhaseInChartProps) {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  // Fetch phase-in data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Use the API route to fetch phase-in data
        const response = await fetch(`/api/phase-in-data?country=${country}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.error) {
          throw new Error(result.error)
        }
        
        // Add total value data to each year
        const processedData = result.data.map((yearData: any) => {
          // Calculate the total for this year
          const totalValue = PHASE_IN_VARIABLES.reduce((sum, variable) => {
            // Ensure no negative values
            const value = yearData[variable.id] || 0;
            return sum + Math.max(0, value); // Only add positive values
          }, 0)
          
          // Create final year data with no negative values
          const yearDataWithoutNegatives = { ...yearData };
          
          // Ensure all variables are non-negative
          PHASE_IN_VARIABLES.forEach(variable => {
            yearDataWithoutNegatives[variable.id] = Math.max(0, yearData[variable.id] || 0);
          });
          
          return {
            ...yearDataWithoutNegatives,
            totalValue: parseFloat(totalValue.toFixed(2))
          }
        })
        
        setData(processedData)
      } catch (e: any) {
        console.error("Error fetching phase-in data:", e)
        setError(e.message || "An error occurred while fetching data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [country])

  // Format values with appropriate unit (GW)
  const formatValue = (value: number, detailed: boolean = false): string => {
    // Convert from MW to GW
    const valueInGW = value / 1000;
    
    if (valueInGW === 0) return "0";
    
    if (detailed) {
      if (valueInGW < 0.001) return valueInGW.toExponential(1) + " GW";
      if (valueInGW < 0.01) return valueInGW.toFixed(3) + " GW";
      if (valueInGW < 0.1) return valueInGW.toFixed(2) + " GW";
      if (valueInGW < 10) return valueInGW.toFixed(1) + " GW";
      return Math.round(valueInGW) + " GW";
    } else {
      return valueInGW.toLocaleString(undefined, {maximumFractionDigits: 1}) + " GW";
    }
  };

  // Group phase-in variables into categories for the tooltip
  const PHASE_IN_CATEGORIES = [
    {
      name: "Energy Storage",
      variables: ["battery_long", "battery_short"]
    },
    {
      name: "Renewable Energy",
      variables: ["geothermal", "hydropower", "offshore_wind", "onshore_wind", "solar"]
    }
  ];

  // Custom tooltip that shows categorized capacity with better formatting
  const CustomTooltip = (props: any) => {
    const { active, payload, label } = props;
  
    if (active && payload && payload.length) {
      // Find the data for this year to get total
      const yearData = data.find(item => item.year === label);
      
      if (!yearData) return null;
      
      const totalValue = yearData.totalValue;
      const totalFormatted = (totalValue / 1000).toLocaleString(undefined, {maximumFractionDigits: 1});
      
      // Calculate totals for each category
      const categoryTotals = PHASE_IN_CATEGORIES.map(category => {
        const total = category.variables.reduce((sum, varId) => {
          return sum + (yearData[varId] || 0);
        }, 0);
        return {
          name: category.name,
          total: total,
          percentage: (total / totalValue) * 100
        };
      });
      
      // Build a mapping of variable ID to payload entry for easier access
      const variableMap = payload.reduce((map: any, entry: any) => {
        map[entry.dataKey] = entry;
        return map;
      }, {});
      
      return (
        <div style={{
          backgroundColor: theme === "dark" ? "#1F2937" : "#1F2937",
          color: "white",
          borderRadius: "8px",
          padding: "16px",
          minWidth: "350px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
            borderBottom: "1px solid rgba(255,255,255,0.2)",
            paddingBottom: '12px'
          }}>
            <span style={{fontSize: '16px', fontWeight: 'bold'}}>Year: {label}</span>
            <span style={{fontSize: '16px', fontWeight: 'bold'}}>{totalFormatted} GW</span>
          </div>

          {categoryTotals.map((category, categoryIndex) => {
            // Format the total with commas and convert to GW
            const categoryTotalFormatted = (category.total / 1000).toLocaleString(undefined, {maximumFractionDigits: 1});
            
            return (
              <div key={`category-${categoryIndex}`} style={{marginBottom: '12px'}}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>{category.name}</span>
                  <span>{categoryTotalFormatted} GW ({category.percentage.toFixed(1)}%)</span>
                </div>
                
                {PHASE_IN_CATEGORIES[categoryIndex].variables.map((varId) => {
                  const variable = PHASE_IN_VARIABLES.find(v => v.id === varId);
                  const entry = variableMap[varId];
                  
                  if (!variable || !entry || entry.value === 0) return null;
                  
                  // Calculate percentage within this category and format the value with commas
                  const percentage = (entry.value / category.total) * 100;
                  const valueInGW = entry.value / 1000;
                  const valueFormatted = valueInGW.toLocaleString(undefined, {maximumFractionDigits: 1});
                  
                  return (
                    <div key={`var-${varId}`} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '14px',
                      marginLeft: '16px',
                      marginBottom: '4px'
                    }}>
                      <div style={{display: 'flex', alignItems: 'center'}}>
                        <span style={{
                          display: 'inline-block', 
                          width: '12px', 
                          height: '12px', 
                          backgroundColor: variable.color, 
                          marginRight: '8px'
                        }}></span>
                        <span>{variable.name}</span>
                      </div>
                      <div>
                        {valueFormatted} GW ({percentage.toFixed(1)}%)
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
    // Check if user is authenticated
    if (isAuthenticated) {
      // Redirect to the download page with query parameters
      router.push(`/downloads/phase-in-data?country=${country}`);
    } else {
      // Redirect to login page with return URL
      router.push(`/login?returnTo=/downloads/phase-in-data?country=${country}`);
    }
  }

  if (isLoading) {
    return (
      <Card className={cn("dark:bg-[#2F3A2F] flex flex-col h-full", className)}>
        <CardHeader className="flex-none pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle>Clean Energy Capacity Additions</CardTitle>
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
      <Card className={cn("dark:bg-[#2F3A2F] flex flex-col h-full", className)}>
        <CardHeader className="flex-none pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle>Clean Energy Capacity Additions</CardTitle>
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
    <Card className={cn("dark:bg-[#2F3A2F] flex flex-col h-full", className)}>
      <CardHeader className="flex-none pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle>Clean Energy Capacity Additions</CardTitle>
          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
            <InfoDialog title="Figure Notes">
              <FormattedNotes />
            </InfoDialog>
          </div>
        </div>
        <CardDescription>Phase-In Capacity (GW) from 2025 to 2050 - {COUNTRY_NAMES[country]}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
        <div className="flex-1 min-h-0">
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
                    label={{
                      value: "Capacity (GW)",
                      angle: -90,
                      position: "insideLeft",
                      fill: theme === "dark" ? "#ffffff" : "#000000",
                      offset: 0,
                      fontSize: 11
                    }}
                    tick={{ fill: theme === "dark" ? "#ffffff" : "#000000", fontSize: 10 }}
                    tickMargin={5}
                    width={60}
                    domain={[0, 'dataMax']} 
                    allowDataOverflow={false}
                    allowDecimals={true}
                    minTickGap={5}
                    tickFormatter={(value) => {
                      if (value === 0) return "0";
                      
                      // Convert MW to GW for display
                      const valueInGW = value / 1000;
                      
                      // Check if all data values are very small
                      const maxValue = Math.max(...data.map(d => {
                        // Calculate total for this year
                        return PHASE_IN_VARIABLES.reduce((sum, variable) => {
                          return sum + Math.max(0, d[variable.id] || 0);
                        }, 0);
                      }));
                      
                      const maxValueInGW = maxValue / 1000;
                      
                      // For very small datasets, use appropriate decimal places
                      if (maxValueInGW < 0.01) return valueInGW.toFixed(3);
                      if (maxValueInGW < 0.1) return valueInGW.toFixed(2);
                      if (maxValueInGW < 1) return valueInGW.toFixed(1);
                      
                      // For regular-sized datasets, use fewer decimal places
                      if (valueInGW < 0.1) return valueInGW.toFixed(1);
                      
                      // Format large numbers with commas
                      return valueInGW >= 1000 
                        ? (valueInGW / 1000).toFixed(0) + 'k'
                        : valueInGW.toFixed(0);
                    }}
                    scale="linear"
                    interval="preserveStartEnd"
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" }} />
                  {PHASE_IN_VARIABLES.map((variable) => (
                    <Bar 
                      key={variable.id} 
                      dataKey={variable.id} 
                      stackId="a" 
                      fill={variable.color} 
                      name={variable.name}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
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