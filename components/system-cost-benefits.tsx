"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { COUNTRY_NAMES } from "@/lib/constants"
import { useTheme } from "next-themes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Download, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const FIGURE_NOTES = "This figure shows the analysis of costs and benefits related to climate change mitigation. The benefits are divided into three categories: Benefits from Air Pollution (health benefits), Benefits to the Country (economic benefits within the country), and Benefits to the Rest of the World (global climate benefits). The Social Cost of Carbon (SCC) represents the monetary value of damages from emitting one ton of carbon dioxide, with different price scenarios (80, 190, or 1056 USD per ton). Data is shown for different time horizons (2035 or 2050)."

// Colors for the pie charts
const COLORS = {
  costs: ["#ff7c43", "#ffa600", "#ff9e6d"],
  benefits: ["#00b4d8", "#0096c7", "#48cae4"],
}

// SCC options for the dropdown
const sccOptions = [
  { value: "80", label: "SCC 80 USD" },
  { value: "190", label: "SCC 190 USD" },
  { value: "1056", label: "SCC 1056 USD" },
]

// Time horizon options for the dropdown
const timeHorizons = [
  { value: "2035", label: "Until 2035" },
  { value: "2050", label: "Until 2050" },
]

// Map from 2-letter codes to 3-letter ISO codes for API
const COUNTRY_CODE_MAP: { [key: string]: string } = {
  "in": "IND", // India
  "id": "IDN", // Indonesia
  "za": "ZAF", // South Africa
  "vn": "VNM", // Vietnam
  "ir": "IRN", // Iran
  "mx": "MEX", // Mexico
  "ng": "NGA", // Nigeria
  "eg": "EGY", // Egypt
  "ke": "KEN", // Kenya
  "tz": "TZA", // Tanzania
  "th": "THA", // Thailand
  "ug": "UGA"  // Uganda
};

export function SystemCostBenefits({ className, country = "IND" }: { className?: string; country?: string }) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
  const [selectedSCC, setSelectedSCC] = useState("80")
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState("2035")
  const { isAuthenticated } = useAuth()

  // Convert country code to lowercase for COUNTRY_NAMES lookup
  const countryLower = country.toLowerCase();
  
  // Get country name from constants, fallback to country code
  const countryName = COUNTRY_NAMES[countryLower] || country;

  const router = useRouter()

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    // Determine the correct API country code
    // If country is a 2-letter code, map it to 3-letter code, otherwise use as-is
    const apiCountryCode = country.length === 2 ? 
      COUNTRY_CODE_MAP[country.toLowerCase()] : 
      country;

    console.log(`Fetching data for: country=${apiCountryCode}, scc=${selectedSCC}, timeHorizon=${selectedTimeHorizon}`)

    fetch(`/api/system-cost-benefits?country=${apiCountryCode}&scc=${selectedSCC}&timeHorizon=${selectedTimeHorizon}`)
      .then((res) => res.json())
      .then((fetchedData) => {
        if (fetchedData.error) {
          throw new Error(fetchedData.error)
        }
        
        console.log("Raw data from API:", JSON.stringify(fetchedData, null, 2))
        
        // Ensure proper numeric formatting for all benefit values
        // This is particularly important for small values that might be coming as strings
        const processedData = {
          ...fetchedData,
          airPollutionBenefit: Number(fetchedData.airPollutionBenefit) || 0,
          countryBenefit: Number(fetchedData.countryBenefit) || 0,
          worldBenefit: Number(fetchedData.worldBenefit) || 0,
          totalBenefit: Number(fetchedData.totalBenefit) || 0,
        }
        
        console.log("Processed benefit values (after Number conversion):", {
          airPollutionBenefit: processedData.airPollutionBenefit,
          countryBenefit: processedData.countryBenefit,
          worldBenefit: processedData.worldBenefit,
          totalBenefit: processedData.totalBenefit
        })
        
        setData(processedData)
      })
      .catch((err) => {
        console.error("Error fetching system cost benefits data:", err)
        setError(err.message || "Failed to load data")
      })
      .finally(() => setIsLoading(false))
  }, [country, selectedSCC, selectedTimeHorizon])

  const handleDownload = () => {
    // Determine the correct API country code
    const apiCountryCode = country.length === 2 ? 
      COUNTRY_CODE_MAP[country.toLowerCase()] : 
      country;
    
    // Check if user is authenticated
    if (isAuthenticated) {
      // Redirect to the download page with query parameters
      router.push(`/downloads/system-cost-benefits?country=${apiCountryCode}&scc=${selectedSCC}&timeHorizon=${selectedTimeHorizon}`);
    } else {
      // Redirect to login page with return URL
      router.push(`/login?returnTo=/downloads/system-cost-benefits?country=${apiCountryCode}&scc=${selectedSCC}&timeHorizon=${selectedTimeHorizon}`);
    }
  }

  if (isLoading) {
    return (
      <Card className="dark:bg-[#2F3A2F]">
        <CardHeader>
          <CardTitle>System Cost and Benefits</CardTitle>
          <CardDescription>Loading data for {countryName}...</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
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
      <Card className="dark:bg-[#2F3A2F]">
        <CardHeader>
          <CardTitle>System Cost and Benefits</CardTitle>
          <CardDescription>
            Data temporarily unavailable for {countryName}. Please try again later.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
          <p>We're working on gathering this data. Please check back soon.</p>
        </CardContent>
      </Card>
    )
  }

  const tooltipStyle = {
    backgroundColor: theme === "dark" ? "rgba(31, 41, 55, 0.85)" : "rgba(255, 255, 255, 0.85)",
    border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
    borderRadius: "6px",
    padding: "12px",
    color: theme === "dark" ? "white" : "black",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    zIndex: 1000,
  }

  const renderTooltipContent = (props: any) => {
    const { payload } = props
    if (!payload || !payload[0]) return null

    const tooltipData = payload[0].payload
    
    // Use actualValue if available, otherwise fallback to value
    const value = tooltipData.actualValue !== undefined ? tooltipData.actualValue : tooltipData.value;
    const totalValue = tooltipData.type === "cost" ? tooltipData.totalCost : tooltipData.totalBenefit;
    
    // Calculate percentage only if total is greater than zero
    let percentage = 0;
    if (totalValue > 0) {
      percentage = (value / totalValue) * 100;
    }
    
    // Format value display based on magnitude and using the same billion/trillion logic
    let valueDisplay;
    if (value === 0) {
      valueDisplay = "$0";
    } else if (useBillions) {
      // Display in billions
      const valueInBillions = value * 1000;
      if (valueInBillions >= 0.1) {
        valueDisplay = `$${valueInBillions.toFixed(2)}B`;
      } else if (valueInBillions >= 0.001) {
        valueDisplay = `$${valueInBillions.toFixed(3)}B`;
      } else if (valueInBillions > 0) {
        valueDisplay = `$${valueInBillions.toFixed(6)}B`;
      } else {
        valueDisplay = "$0";
      }
    } else {
      // Display in trillions
      if (value >= 0.1) {
        valueDisplay = `$${value.toFixed(2)}T`;
      } else if (value >= 0.001) {
        valueDisplay = `$${value.toFixed(4)}T`;
      } else if (value > 0) {
        valueDisplay = `$${value.toFixed(6)}T`;
      } else {
        valueDisplay = "$0";
      }
    }
    
    return (
      <div style={tooltipStyle}>
        <p style={{ color: tooltipStyle.color, marginBottom: "4px", fontWeight: 500 }}>{tooltipData.name}</p>
        <p style={{ color: tooltipStyle.color, opacity: 0.9 }}>{valueDisplay}</p>
        {value > 0 && (
          <p style={{ color: tooltipStyle.color, opacity: 0.9 }}>
            {percentage.toFixed(1)}%
          </p>
        )}
      </div>
    )
  }

  const costsData = data.costs.map((item: any) => ({
    ...item,
    type: "cost",
    totalCost: data.totalCost,
  }))

  // Create benefits data arrays with proper handling for small or zero values
  const benefitsData = [];
  const totalBenefit = data.totalBenefit || 0.000001; // Prevent division by zero

  // For very small values, we need to scale them relative to each other to make the chart visually meaningful
  // while preserving the actual values for tooltips
  const airPollutionValue = data.airPollutionBenefit;
  const countryValue = data.countryBenefit;
  const worldValue = data.worldBenefit;

  console.log("Raw benefit values from API:", {
    airPollution: airPollutionValue,
    country: countryValue,
    world: worldValue,
    total: data.totalBenefit
  });

  // FOR TESTING: Set demo values to ensure visualization works
  // REMOVE THIS FOR PRODUCTION OR ONCE API VALUES ARE CONFIRMED
  const useTestValues = false; // Using real API data now
  
  // These test values are kept for reference but won't be used (useTestValues = false)
  const testAirPollutionValue = 0.42;
  const testCountryValue = 0.67;
  const testWorldValue = 0.31;
  
  // Use either test values or API values
  const displayAirPollutionValue = useTestValues ? testAirPollutionValue : airPollutionValue;
  const displayCountryValue = useTestValues ? testCountryValue : countryValue;
  const displayWorldValue = useTestValues ? testWorldValue : worldValue;
  const displayTotalBenefit = useTestValues ? 
    (testAirPollutionValue + testCountryValue + testWorldValue) : 
    data.totalBenefit;

  // Check if all values are extremely small or zero
  const allSmallOrZero = displayAirPollutionValue < 0.001 && displayCountryValue < 0.001 && displayWorldValue < 0.001;
  
  // Count how many segments have non-zero values (even if very small)
  const nonZeroSegments = [displayAirPollutionValue, displayCountryValue, displayWorldValue]
    .filter(v => v > 0).length;

  // Determine if we should use billions instead of trillions for display
  const smallerTotal = Math.min(data.totalCost, data.totalBenefit);
  const useBillions = smallerTotal < 0.1;
  
  // Create a scaling factor for very small values to make their proportions visible
  // This ensures we can see the relative sizes between segments
  const getChartValue = (value: number): number => {
    // If all values are zero, create equal segments
    if (nonZeroSegments === 0) {
      return 1;
    } 
    
    // For very small positive values
    if (value > 0 && value < 0.001) {
      // Use logarithmic scaling for very small values to make differences more visible
      // This will ensure tiny values are still shown with visible differences
      return 0.5 + Math.log10(value * 10000 + 1) * 0.2;
    }
    
    // For zero values when others are non-zero, make them very small but visible
    if (value <= 0 && nonZeroSegments > 0) {
      return 0.05;
    }
    
    // For normal sized values, use the actual value but ensure a minimum size
    return Math.max(value, 0.1);
  };

  // Add the three benefit categories with properly scaled values
  benefitsData.push({
    name: "Benefits from Air Pollution",
    value: getChartValue(displayAirPollutionValue), // Scaled value for chart display
    color: COLORS.benefits[0],
    type: "benefit",
    totalBenefit: displayTotalBenefit,
    actualValue: displayAirPollutionValue, // Store actual value for tooltip
  });

  benefitsData.push({
    name: "Benefits to the Country",
    value: getChartValue(displayCountryValue),
    color: COLORS.benefits[1],
    type: "benefit",
    totalBenefit: displayTotalBenefit,
    actualValue: displayCountryValue,
  });

  benefitsData.push({
    name: "Benefits to the Rest of the World",
    value: getChartValue(displayWorldValue),
    color: COLORS.benefits[2],
    type: "benefit",
    totalBenefit: displayTotalBenefit,
    actualValue: displayWorldValue,
  });

  console.log("Chart values after scaling:", benefitsData.map(d => ({ name: d.name, value: d.value })));

  // Format the total benefit display - show more decimal places for small values
  const totalBenefitDisplay = useTestValues ? 
    `$${displayTotalBenefit.toFixed(1)}T` :
    (data.totalBenefit > 0 ? 
      (data.totalBenefit >= 0.1 ? 
        `$${data.totalBenefit.toFixed(1)}T` : 
        data.totalBenefit >= 0.001 ?
        `$${(data.totalBenefit * 1000).toFixed(1)}B` :
        `$${(data.totalBenefit * 1000).toFixed(3)}B`) : 
      "$0.0B");

  const formatValue = (value: number) => {
    if (useBillions) {
      // Convert to billions
      const valueInBillions = value * 1000;
      return `$${valueInBillions.toFixed(1)}B`;
    } else {
      // Keep in trillions
      return `$${value.toFixed(1)}T`;
    }
  };

  return (
    <Card className={cn("flex flex-col h-full dark:bg-[#2F3A2F]", className)}>
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between">
          <CardTitle>System Cost and Benefits</CardTitle>
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
        <CardDescription>
          Comparison of total costs and benefits - {countryName}
        </CardDescription>
        <div className="flex flex-wrap gap-4 mt-4">
          <Select value={selectedSCC} onValueChange={setSelectedSCC}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select SCC" />
            </SelectTrigger>
            <SelectContent>
              {sccOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTimeHorizon} onValueChange={setSelectedTimeHorizon}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time horizon" />
            </SelectTrigger>
            <SelectContent>
              {timeHorizons.map((horizon) => (
                <SelectItem key={horizon.value} value={horizon.value}>
                  {horizon.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 h-full">
          <div className="w-full flex flex-col justify-center">
            <div className="relative h-[180px] md:h-[240px] lg:h-[280px] mx-auto w-full max-w-[300px]">
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              >
                <p className="text-2xl md:text-2xl font-bold leading-none mb-1">{formatValue(data.totalCost)}</p>
                <p className="text-xs md:text-xs text-muted-foreground">{data.costGdpPercentage}% of GDP</p>
              </div>
              <ResponsiveContainer width="100%" height="100%" style={{ position: 'relative', zIndex: 1 }}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={costsData}
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {costsData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-cost-${index}`}
                        fill={entry.color || COLORS.costs[index % COLORS.costs.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={renderTooltipContent} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center font-medium text-sm mt-0">Total Cost</p>
          </div>

          <div className="w-full flex flex-col justify-center">
            <div className="relative h-[180px] md:h-[240px] lg:h-[280px] mx-auto w-full max-w-[300px]">
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              >
                <p className="text-2xl md:text-2xl font-bold leading-none mb-1">{totalBenefitDisplay}</p>
                <p className="text-xs md:text-xs text-muted-foreground">{data.benefitGdpPercentage}% of GDP</p>
              </div>
              <ResponsiveContainer width="100%" height="100%" style={{ position: 'relative', zIndex: 1 }}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={benefitsData}
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    startAngle={90}
                    endAngle={450}
                    label={false}
                    labelLine={false}
                  >
                    {benefitsData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-benefit-${index}`}
                        fill={entry.color || COLORS.benefits[index % COLORS.benefits.length]}
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={renderTooltipContent} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center font-medium text-sm mt-0">Total Benefit</p>
          </div>
        </div>

        <div className="flex justify-center mt-1 md:mt-2">
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

