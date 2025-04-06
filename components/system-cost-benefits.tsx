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
import Link from "next/link"
import { InfoDialog } from "@/components/ui/info-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Format notes with proper styling
const FormattedNotes = () => (
  <div className="prose prose-sm dark:prose-invert max-w-none">
    <p>
      This figure illustrates the estimated <strong>transition investment needs</strong> and the <strong>implied reduction in economic damages</strong> for countries to achieve alignment with their respective net-zero transition plans and targets, as stipulated in the scenario pathways provided by the <a href="https://www.ngfs.net/ngfs-scenarios-portal/explore/" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">Network for Greening the Financial System (NGFS)</a>.
    </p>
    
    <h3 className="text-lg font-semibold mt-4 mb-2">Transition investment needs</h3>
    <p>categorized into three distinct components:</p>
    
    <ol className="list-decimal pl-5 my-2 space-y-1">
      <li><strong>Phase-out costs</strong>: The costs associated with the early retirement of fossil fuel power plants, ahead of their initially planned lifetimes.</li>
      <li><strong>Investments into renewables</strong>: The investments required to deploy renewable power generation capacity to replace the phased-out fossil fuel capacity.</li>
      <li><strong>Investments into infrastructure</strong>: The investments required to expanding grid infrastructure, developing electricity storage capacity, and deploying other supporting technologies necessary to integrate renewable generation.</li>
    </ol>
    
    <p>The <strong>Finance Source</strong> chart displays the allocation of total investment needs between public and private funding sources.</p>

    <h3 className="text-lg font-semibold mt-4 mb-2">The reduced economic damages</h3>
    <p>categorized into three distinct components:</p>
    
    <ol className="list-decimal pl-5 my-2 space-y-1">
      <li><strong>Domestic damage reduction</strong>: Lower economic losses within the country, stemming from avoided climate-related damages, productivity losses, and adaptation costs.</li>
      <li><strong>Global damage reduction</strong>: Lower economic losses to the rest of the world, stemming from avoided climate-related damages, productivity losses, and adaptation costs.</li>
      <li><strong>Reduced air pollution damages</strong>: Economic benefits arising from improved air quality and associated health and productivity gains.</li>
    </ol>
    
    <p className="mt-4">
      The <strong>Social Cost of Carbon (SCC)</strong> represents the estimated monetary value of economic damages caused by emitting one metric ton of carbon dioxide. Three SCC values are considered—<strong>80, 190, and 1,056 USD per ton</strong>—reflecting different damage cost assumptions. Results are presented for two key time horizons: <strong>2035</strong> and <strong>2050</strong>, and are discounted to present value terms.
    </p>
  </div>
);

// Colors for the pie charts
const COLORS = {
  costs: ["#ff7c43", "#ffa600", "#ff9e6d"],
  benefits: ["#00b4d8", "#0096c7", "#48cae4"],
}

// SCC options for the dropdown
const sccOptions = [
  { value: "80", label: "80 USD" },
  { value: "190", label: "190 USD" },
  { value: "1056", label: "1056 USD" },
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
  const [selectedSCC, setSelectedSCC] = useState("80")
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState("2035")
  const { isAuthenticated } = useAuth()
  
  // New state structure to store all SCC data
  const [allData, setAllData] = useState<{
    [scc: string]: any
  }>({})
  
  // Computed data based on selected SCC
  const data = allData[selectedSCC]
  
  // New state for the tabs
  const [investmentTab, setInvestmentTab] = useState("cost-breakdown")

  // Convert country code to lowercase for COUNTRY_NAMES lookup
  const countryLower = country.toLowerCase();
  
  // Get country name from constants, fallback to country code
  const countryName = COUNTRY_NAMES[countryLower] || country;

  const router = useRouter()
  
  // Function to generate finance source data (2/3 private, 1/3 public)
  const getFinanceSourceData = (totalCost: number) => {
    const privateFinance = totalCost * (2/3);
    const publicFinance = totalCost * (1/3);
    
    return [
      {
        name: "Privately Financed",
        value: privateFinance,
        color: "#ffa600",
        type: "cost",
        totalCost: totalCost,
      },
      {
        name: "Publicly Financed",
        value: publicFinance,
        color: "#ff7c43",
        type: "cost",
        totalCost: totalCost,
      }
    ];
  };

  // Function to process data from API
  const processData = (fetchedData: any) => {
    if (fetchedData.error) {
      throw new Error(fetchedData.error)
    }
    
    // Ensure proper numeric formatting for all benefit values
    return {
      ...fetchedData,
      airPollutionBenefit: Number(fetchedData.airPollutionBenefit) || 0,
      countryBenefit: Number(fetchedData.countryBenefit) || 0,
      worldBenefit: Number(fetchedData.worldBenefit) || 0,
      totalBenefit: Number(fetchedData.totalBenefit) || 0,
    }
  }

  // Load data for all SCC values in parallel
  useEffect(() => {
    const loadAllSCCData = async () => {
      setIsLoading(true)
      setError(null)

      // Determine the correct API country code
      const apiCountryCode = country.length === 2 ? 
        COUNTRY_CODE_MAP[country.toLowerCase()] : 
        country;

      try {
        const fetchPromises = sccOptions.map(option => 
          fetch(`/api/system-cost-benefits?country=${apiCountryCode}&scc=${option.value}&timeHorizon=${selectedTimeHorizon}`)
            .then(res => res.json())
            .then(data => processData(data))
        );
        
        const results = await Promise.all(fetchPromises);
        
        // Create object with SCC as keys
        const newAllData: {[key: string]: any} = {};
        sccOptions.forEach((option, index) => {
          newAllData[option.value] = results[index];
        });
        
        setAllData(newAllData);
      } catch (err: any) {
        console.error("Error fetching system cost benefits data:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAllSCCData();
  }, [country, selectedTimeHorizon]);

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
          <CardTitle className="text-xl md:text-2xl font-bold">Investment Needs & Reduced Damages</CardTitle>
          <CardDescription>Loading data for {countryName}...</CardDescription>
        </CardHeader>
        <CardContent className="h-[500px] flex items-center justify-center">
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
          <CardTitle className="text-xl md:text-2xl font-bold">Investment Needs & Reduced Damages</CardTitle>
          <CardDescription>
            Data temporarily unavailable for {countryName}. Please try again later.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[500px] flex items-center justify-center text-muted-foreground">
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

  // Function to prepare chart data for current SCC
  const prepareChartData = (currentData: any) => {
    if (!currentData) return { costsData: [], benefitsData: [], totalBenefitDisplay: "$0.0" };
    
    const costsData = currentData.costs.map((item: any) => ({
      ...item,
      type: "cost",
      totalCost: currentData.totalCost,
    }));

    // Create benefits data arrays with proper handling for small or zero values
    const benefitsData = [];
    const totalBenefit = currentData.totalBenefit || 0.000001; // Prevent division by zero

    // For very small values, we need to scale them relative to each other
    const airPollutionValue = currentData.airPollutionBenefit;
    const countryValue = currentData.countryBenefit;
    const worldValue = currentData.worldBenefit;
    
    // Use actual API values
    const displayAirPollutionValue = airPollutionValue;
    const displayCountryValue = countryValue;
    const displayWorldValue = worldValue;
    const displayTotalBenefit = currentData.totalBenefit;

    // Count how many segments have non-zero values
    const nonZeroSegments = [displayAirPollutionValue, displayCountryValue, displayWorldValue]
      .filter(v => v > 0).length;

    // Determine if we should use billions instead of trillions for display
    const smallerTotal = Math.min(currentData.totalCost, currentData.totalBenefit);
    const useBillions = smallerTotal < 0.1;
    
    // Create a scaling factor for very small values to make their proportions visible
    const getChartValue = (value: number): number => {
      // If all values are zero, create equal segments
      if (nonZeroSegments === 0) {
        return 1;
      } 
      
      // For very small positive values
      if (value > 0 && value < 0.001) {
        // Use logarithmic scaling for very small values to make differences more visible
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
      name: "Reduced Air Pollution Damages",
      value: getChartValue(displayAirPollutionValue),
      color: COLORS.benefits[0],
      type: "benefit",
      totalBenefit: displayTotalBenefit,
      actualValue: displayAirPollutionValue,
    });

    benefitsData.push({
      name: "Domestic Damage Reduction",
      value: getChartValue(displayCountryValue),
      color: COLORS.benefits[1],
      type: "benefit",
      totalBenefit: displayTotalBenefit,
      actualValue: displayCountryValue,
    });

    benefitsData.push({
      name: "Global Damage Reduction",
      value: getChartValue(displayWorldValue),
      color: COLORS.benefits[2],
      type: "benefit",
      totalBenefit: displayTotalBenefit,
      actualValue: displayWorldValue,
    });

    // Format the total benefit display
    const totalBenefitDisplay = (currentData.totalBenefit > 0 ? 
      (currentData.totalBenefit >= 0.1 ? 
        `$${currentData.totalBenefit.toFixed(1)}T` : 
        currentData.totalBenefit >= 0.001 ?
        `$${(currentData.totalBenefit * 1000).toFixed(1)}B` :
        `$${(currentData.totalBenefit * 1000).toFixed(3)}B`) : 
      "$0.0B");

    return { costsData, benefitsData, totalBenefitDisplay, useBillions };
  }

  // Process chart data once for current selection
  const { costsData, benefitsData, totalBenefitDisplay, useBillions } = prepareChartData(data);

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
          <CardTitle className="text-xl md:text-2xl font-bold">Investment Needs & Reduced Damages</CardTitle>
          <InfoDialog title="Figure Notes">
            <FormattedNotes />
          </InfoDialog>
        </div>
        <CardDescription>
          Comparison of Investment Needs and Reduced Damages - {countryName}
        </CardDescription>
        <Select value={selectedTimeHorizon} onValueChange={setSelectedTimeHorizon}>
          <SelectTrigger className="w-[180px] mt-4">
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
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 h-full">
          <div className="w-full flex flex-col justify-center">
            <p className="text-center font-semibold text-base mb-2">Investment Needs</p>
            <div className="relative h-[200px] md:h-[250px] lg:h-[280px] mx-auto w-full max-w-[350px]">
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              >
                <p className="text-3xl md:text-3xl font-bold leading-none mb-1">{formatValue(data.totalCost)}</p>
                <p className="text-xs md:text-xs text-muted-foreground">{data.costGdpPercentage}% of GDP</p>
              </div>
              <ResponsiveContainer width="100%" height="100%" style={{ position: 'relative', zIndex: 1 }}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={investmentTab === "cost-breakdown" ? costsData : getFinanceSourceData(data.totalCost)}
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {(investmentTab === "cost-breakdown" ? costsData : getFinanceSourceData(data.totalCost)).map((entry: any, index: number) => (
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
            <div className="w-full mt-0">
              <div className="h-5">
                {/* Empty space to match SCC label height */}
              </div>
              <Tabs 
                defaultValue="cost-breakdown" 
                onValueChange={setInvestmentTab}
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="cost-breakdown" className="text-xs px-2">Cost Breakdown</TabsTrigger>
                  <TabsTrigger value="finance-source" className="text-xs px-2">Finance Source</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="w-full flex flex-col justify-center">
            <p className="text-center font-semibold text-base mb-2">Reduced Damages</p>
            <div className="relative h-[200px] md:h-[250px] lg:h-[280px] mx-auto w-full max-w-[350px]">
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              >
                <p className="text-3xl md:text-3xl font-bold leading-none mb-1 transition-all duration-300 ease-in-out">
                  {totalBenefitDisplay}
                </p>
                <p className="text-xs md:text-xs text-muted-foreground transition-all duration-300 ease-in-out">
                  {data?.benefitGdpPercentage}% of GDP
                </p>
              </div>
              <ResponsiveContainer width="100%" height="100%" style={{ position: 'relative', zIndex: 1 }}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={benefitsData}
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    startAngle={90}
                    endAngle={450}
                    label={false}
                    labelLine={false}
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
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
            <div className="w-full mt-0">
              <div className="text-center text-xs text-muted-foreground h-5 flex items-center justify-center">
                Social Cost of Carbon (SCC)
              </div>
              <Tabs 
                defaultValue="80" 
                onValueChange={setSelectedSCC}
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-3">
                  {sccOptions.map((option) => (
                    <TabsTrigger key={option.value} value={option.value} className="text-xs px-1">
                      {option.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-2">
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

