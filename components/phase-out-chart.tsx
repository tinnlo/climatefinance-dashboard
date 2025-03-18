"use client"

import { useState, useRef, useEffect } from "react"
import { useTheme } from "next-themes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts"
import { convertToIso3, iso2ToIso3Map } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

// Update scenario values to match the data structure
const scenarios = [
  { value: "maturity", label: "By Power Plant Maturity" },
  { value: "emission_factor", label: "By Power Plant Emission Intensity" },
  { value: "benefits_cost_maturity", label: "By Power Plant Benefits/Costs (Including Plant Maturity)" },
]

// Mapping for scenario names to file name parts
const scenarioToFileNameMap: { [key: string]: string } = {
  "maturity": "maturity",
  "emission_factor": "emission_intensity",
  "benefits_cost_maturity": "benefits_costs"
}

// Country names mapping
const COUNTRY_NAMES: { [key: string]: string } = {
  'eg': 'Egypt',
  'id': 'Indonesia',
  'in': 'India',
  'ir': 'Iran',
  'ke': 'Kenya',
  'mx': 'Mexico',
  'ng': 'Nigeria',
  'th': 'Thailand',
  'tz': 'Tanzania',
  'ug': 'Uganda',
  'vn': 'Vietnam',
  'za': 'South Africa'
} as const

interface PhaseOutData {
  year: number
  amount_mtco2: number
  cumulative_mtco2: number
  start_rank: number
  end_rank: number
  n_plants: number
  plants_by_subsector: {
    Coal: number
    Gas: number
    Oil: number
  }
}

interface ChartData {
  country_code: string
  country_name: string
  scenarios: {
    [key: string]: PhaseOutData[]
  }
}

interface AssetData {
  uniqueforwardassetid: string
  asset_name: string
  subsector: string
  amount_mtco2: number
  year: number
  Country_ISO3: string
  Status: string
  Start_Year: number
  Retired_Year: number | null
  Capacity: number
  Capacity_Unit: string
  Emissions: number
  Emissions_Unit: string
}

export function PhaseOutChart({ 
  country = "ug", 
  data, 
  initialScenario = "maturity" 
}: { 
  country?: string; 
  data: ChartData | null;
  initialScenario?: string;
}) {
  const [selectedScenario, setSelectedScenario] = useState(initialScenario)
  const [assetData, setAssetData] = useState<AssetData[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(false)
  const [sortField, setSortField] = useState<string>("amount_mtco2")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const { theme, systemTheme } = useTheme()
  const chartRef = useRef<HTMLDivElement>(null)

  // Update selectedScenario when initialScenario prop changes
  useEffect(() => {
    setSelectedScenario(initialScenario)
  }, [initialScenario])

  const currentTheme = theme === "system" ? systemTheme : theme
  const countryCode = convertToIso3(country)
  const countryName = COUNTRY_NAMES[country.toLowerCase()] || countryCode

  // Fetch asset data when country or scenario changes
  useEffect(() => {
    const fetchAssetData = async () => {
      setIsLoadingAssets(true);
      try {
        console.log(`Fetching asset data for ${countryCode} with scenario ${selectedScenario}`);
        // Use the updated API route
        const response = await fetch(`/api/asset-data?country=${countryCode}&scenario=${scenarioToFileNameMap[selectedScenario]}`);
        
        if (!response.ok) {
          console.error(`HTTP error fetching asset data! status: ${response.status}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Log detailed information about the received data
        console.log(`Received asset data:`, {
          dataLength: data?.length || 0,
          isArray: Array.isArray(data),
          isEmpty: Array.isArray(data) && data.length === 0,
          sampleData: Array.isArray(data) && data.length > 0 ? {
            id: data[0].uniqueforwardassetid,
            name: data[0].asset_name,
            subsector: data[0].subsector
          } : null,
          rawData: data // Log the raw data for inspection
        });
        
        // The simple API should always return an array
        if (Array.isArray(data)) {
          // Clean up any remaining NaN values
          const cleanData = data.map(asset => {
            const cleanAsset = { ...asset };
            // Replace any NaN values with null
            Object.keys(cleanAsset).forEach(key => {
              if (cleanAsset[key] !== null && typeof cleanAsset[key] === 'number' && isNaN(cleanAsset[key])) {
                cleanAsset[key] = null;
              }
            });
            return cleanAsset;
          });
          
          setAssetData(cleanData);
        } else {
          console.warn('Asset data is not an array:', data);
          setAssetData([]);
        }
      } catch (error) {
        console.error("Error fetching asset data:", error);
        setAssetData([]);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    if (countryCode) {
      fetchAssetData();
    }
  }, [countryCode, selectedScenario]);

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Set new field and default to descending
      setSortField(field)
      setSortDirection("desc")
    }
  }

  // Sort the asset data
  const sortedAssetData = [...assetData].sort((a, b) => {
    let aValue = a[sortField as keyof AssetData]
    let bValue = b[sortField as keyof AssetData]
    
    // Handle null/undefined values
    if (aValue === null || aValue === undefined) aValue = sortDirection === "asc" ? Number.MAX_VALUE : Number.MIN_VALUE
    if (bValue === null || bValue === undefined) bValue = sortDirection === "asc" ? Number.MAX_VALUE : Number.MIN_VALUE
    
    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === "asc" 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue)
    }
    
    // Handle number comparison
    return sortDirection === "asc" 
      ? (aValue as number) - (bValue as number) 
      : (bValue as number) - (aValue as number)
  })

  // Filter assets based on search term
  const filteredAssetData = sortedAssetData.filter(asset => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (asset.asset_name?.toLowerCase().includes(term) || false) ||
      (asset.subsector?.toLowerCase().includes(term) || false) ||
      (asset.Status?.toLowerCase().includes(term) || false) ||
      (asset.Country_ISO3?.toLowerCase().includes(term) || false) ||
      (String(asset.Capacity || '').includes(term)) ||
      (String(asset.Start_Year || '').includes(term)) ||
      (String(asset.amount_mtco2 || '').includes(term))
    );
  });

  // Enhanced debug logging
  console.log('Phase-out Chart Debug:', {
    inputCountry: country,
    convertedCode: countryCode,
    countryName,
    dataExists: !!data,
    scenariosExist: data && !!data.scenarios,
    availableScenarios: data?.scenarios ? Object.keys(data.scenarios) : 'no scenarios',
    selectedScenario,
    scenarioDataExists: data?.scenarios?.[selectedScenario] ? true : false,
    scenarioDataLength: data?.scenarios?.[selectedScenario]?.length || 0,
    firstDataPoint: data?.scenarios?.[selectedScenario]?.[0] || null,
    assetDataLength: assetData.length,
    assetDataSample: assetData.length > 0 ? assetData[0] : null,
    rawData: data
  })

  const colors = {
    // Bar colors
    Coal: "#0194C5", // Brighter blue
    Gas: "#319B9D", // Teal
    Oil: "#e9c46a", // Yellow

    // Line colors
    annualReduction: "#e63946", // Bright red
    cumulativeEmissions: currentTheme === "dark" ? "#a8dadc" : "#1d3557", // Using the color previously used for cumulativeFromBAU

    text: currentTheme === "dark" ? "#ffffff" : "#000000",
    background: currentTheme === "dark" ? "#333333" : "#ffffff",
    tooltipBackground: currentTheme === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.8)",
    tooltipBorder: currentTheme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
  }

  // Check if data is available for the selected country and scenario
  if (!data || !data.scenarios || !data.scenarios[selectedScenario] || data.scenarios[selectedScenario].length === 0) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <span className="text-muted-foreground text-lg">
          No phase-out data available for {countryName} ({countryCode}) in the {scenarios.find(s => s.value === selectedScenario)?.label.toLowerCase() || selectedScenario} scenario.
        </span>
      </div>
    )
  }

  const chartData = data.scenarios[selectedScenario].map((item) => ({
    ...item,
    Coal: item.plants_by_subsector.Coal,
    Gas: item.plants_by_subsector.Gas,
    Oil: item.plants_by_subsector.Oil,
  }))

  // Calculate summary statistics
  const totalPlants = chartData.reduce((sum, item) => sum + item.n_plants, 0)
  const totalEmissionsReduction = chartData.reduce((sum, item) => sum + item.amount_mtco2, 0)
  const cumulativeEmissionsReduction = chartData[chartData.length - 1]?.cumulative_mtco2 || 0
  const phaseOutPeriod = `${chartData[0]?.year || ''} - ${chartData[chartData.length - 1]?.year || ''}`

  // Group assets by subsector
  const assetsBySubsector = assetData.reduce((acc, asset) => {
    const subsector = asset.subsector || 'Unknown';
    if (!acc[subsector]) {
      acc[subsector] = [];
    }
    acc[subsector].push(asset);
    return acc;
  }, {} as Record<string, AssetData[]>);

  // Calculate asset statistics
  const totalAssets = assetData.length;
  const totalCapacity = assetData.reduce((sum, asset) => sum + (asset.Capacity || 0), 0);
  const totalAssetEmissions = assetData.reduce((sum, asset) => sum + (asset.amount_mtco2 || 0), 0);
  const subsectorCounts = Object.entries(assetsBySubsector).map(([subsector, assets]) => ({
    subsector,
    count: assets.length,
    capacity: assets.reduce((sum, asset) => sum + (asset.Capacity || 0), 0),
    emissions: assets.reduce((sum, asset) => sum + (asset.amount_mtco2 || 0), 0)
  })).sort((a, b) => b.count - a.count);

  return (
    <Card className="p-2 sm:p-4 bg-[#2F3A2F] dark:bg-[#2F3A2F] border-0">
      <div className="flex justify-between items-center mb-2 sm:mb-4">
        <Select onValueChange={setSelectedScenario} defaultValue={selectedScenario}>
          <SelectTrigger className="w-full md:w-[300px]">
            <SelectValue placeholder="Select a scenario" />
          </SelectTrigger>
          <SelectContent>
            {scenarios.map((scenario) => (
              <SelectItem key={scenario.value} value={scenario.value}>
                {scenario.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Container - Takes up 2/3 of the space on large screens */}
        <div className="lg:col-span-2">
          <div ref={chartRef} className="w-full h-[400px] bg-[#2F3A2F] dark:bg-[#2F3A2F] rounded-lg p-2 sm:p-4">
            <div className="h-[70%] md:h-[75%] lg:h-[92%]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={chartData} 
                  margin={{ 
                    top: 20, 
                    right: 10,
                    left: 0,
                    bottom: 20 
                  }}
                >
                  <XAxis
                    dataKey="year"
                    stroke={colors.text}
                    tickFormatter={(value) => (value % 5 === 0 ? value.toString() : "")}
                    fontSize={12}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke={colors.text}
                    fontSize={12}
                    width={40}
                    label={{
                      value: "Annual Emission Reduction (MtCO2)",
                      angle: -90,
                      position: "insideLeft",
                      fill: colors.text,
                      fontSize: 11,
                      dx: -2,
                      dy: 90,
                      className: "hidden md:block"
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={colors.text}
                    fontSize={12}
                    width={40}
                    label={{
                      value: "Cumulative Avoided Emissions (GtCO2)",
                      angle: 90,
                      position: "insideRight",
                      fill: colors.text,
                      fontSize: 11,
                      dx: 2,
                      dy: 98,
                      className: "hidden md:block"
                    }}
                    tickFormatter={(value) => (value / 1000).toFixed(1)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: currentTheme === "dark" ? "rgba(31, 41, 55, 0.95)" : "rgba(255, 255, 255, 0.95)",
                      border: `1px solid ${currentTheme === "dark" ? "#374151" : "#e5e7eb"}`,
                      borderRadius: "6px",
                      padding: "12px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      zIndex: 1000
                    }}
                    itemStyle={{ color: colors.text, opacity: 0.9 }}
                    labelStyle={{ color: colors.text, fontWeight: 500, marginBottom: "4px" }}
                    formatter={(value: any, name: string) => {
                      if (name === "Annual emissions reduction") {
                        return [`${Number(value).toFixed(2)} MtCO2`, name]
                      }
                      return [`${(Number(value) / 1000).toFixed(2)} GtCO2`, name]
                    }}
                    labelFormatter={(label) => `Year: ${label}`}
                  />

                  {/* Stacked Bars */}
                  <Bar yAxisId="left" dataKey="Coal" stackId="a" fill={colors.Coal} name="Coal" />
                  <Bar yAxisId="left" dataKey="Gas" stackId="a" fill={colors.Gas} name="Gas" />
                  <Bar yAxisId="left" dataKey="Oil" stackId="a" fill={colors.Oil} name="Oil" />

                  {/* Lines */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="amount_mtco2"
                    stroke={colors.annualReduction}
                    strokeWidth={2}
                    dot={false}
                    name="Annual emissions reduction"
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulative_mtco2"
                    stroke={colors.cumulativeEmissions}
                    strokeWidth={2}
                    dot={false}
                    name="Cumulative avoided emissions"
                    activeDot={{ r: 4 }}
                  />

                  {/* Custom Legend Layout */}
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    content={({ payload }) => (
                      <div className="flex flex-col gap-1 text-xs md:text-sm w-full px-1 md:px-12">
                        <div className="flex flex-row items-center justify-start gap-2 md:gap-4">
                          {payload?.slice(0, 3).map((entry: any, index: number) => (
                            <div key={`item-${index}`} className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 md:w-3 md:h-3" style={{ backgroundColor: entry.color }} />
                              <span className="text-[10px] md:text-xs">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
                          {payload?.slice(3).map((entry: any, index: number) => (
                            <div key={`line-${index}`} className="flex items-center gap-1 md:gap-2">
                              <div
                                className="w-4 h-0.5 flex-shrink-0"
                                style={{
                                  backgroundColor: entry.color,
                                  borderBottom: index === 1 ? "2px dashed" : "none",
                                  borderColor: entry.color,
                                }}
                              />
                              <span className="text-[10px] md:text-xs" title={entry.value}>
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="text-[8px] md:text-[10px] text-muted-foreground flex flex-col">
                          <div>(N) = Number of plants shut down in that year</div>
                          <div>Start Rank → End Rank of plants in phase-out sequence</div>
                        </div>
                      </div>
                    )}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Statistics Summary Container - Takes up 1/3 of the space on large screens */}
        <div className="lg:col-span-1">
          <Card className="p-3 sm:p-4 lg:p-5 bg-[#2F3A2F] dark:bg-[#2F3A2F] border-[#4A5A4A]">
            <h3 className="text-xl font-semibold mb-3">Phase-Out Summary</h3>
            
            {/* Phase-Out Summary */}
            <div className="space-y-4">
              {isLoadingAssets ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading asset data...</p>
                </div>
              ) : assetData.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#3A4A3A] p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">Assets Amt</p>
                      <p className="text-lg font-medium">{totalAssets}</p>
                    </div>
                    <div className="bg-[#3A4A3A] p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">Cumulative</p>
                      <p className="text-lg font-medium">{(cumulativeEmissionsReduction / 1000).toFixed(2)} GtCO2</p>
                    </div>
                    <div className="bg-[#3A4A3A] p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">Reduction</p>
                      <p className="text-lg font-medium">{totalEmissionsReduction.toFixed(1)} MtCO2</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#3A4A3A] p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">Total Capacity</p>
                      <p className="text-lg font-medium">{totalCapacity.toFixed(0)} MW</p>
                    </div>
                    <div className="bg-[#3A4A3A] p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">Total Emissions</p>
                      <p className="text-lg font-medium">{totalAssetEmissions.toFixed(1)} Mt</p>
                    </div>
                  </div>
                  
                  {/* Subsector Breakdown Preview - Moved above the button */}
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold mb-2">Assets Subsector Breakdown</h4>
                    <div className="flex justify-between items-center">
                      {subsectorCounts.slice(0, 3).map((item) => (
                        <div key={item.subsector} className="flex items-center text-xs mr-2">
                          <div 
                            className="w-2 h-2 rounded-full mr-1.5" 
                            style={{ 
                              backgroundColor: 
                                item.subsector === 'Coal' ? colors.Coal : 
                                item.subsector === 'Gas' ? colors.Gas : 
                                item.subsector === 'Oil' ? colors.Oil : '#888888'
                            }}
                          />
                          <span>{item.subsector}</span>
                          <span className="font-medium ml-1">{item.count}</span>
                        </div>
                      ))}
                      {subsectorCounts.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{subsectorCounts.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* View Asset Details Button - Moved to the bottom */}
                  <div className="mt-8">
                    {/* View Asset Details Button */}
                    <Link 
                      href={`/asset-details?country=${countryCode}&scenario=${selectedScenario}`}
                      passHref
                    >
                      <Button 
                        variant="outline" 
                        className="w-full h-9 text-sm"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Asset Details
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">No asset data available for this scenario.</p>
                  <button 
                    onClick={async () => {
                      setIsLoadingAssets(true);
                      try {
                        console.log(`Retrying asset data fetch for ${countryCode} with scenario ${selectedScenario}`);
                        const response = await fetch(`/api/asset-data?country=${countryCode}&scenario=${scenarioToFileNameMap[selectedScenario]}`, {
                          method: 'GET',
                          cache: 'no-store',
                          headers: {
                            'Accept': 'application/json'
                          }
                        });
                        
                        if (!response.ok) {
                          throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        
                        const data = await response.json();
                        
                        // Log detailed information about the retry response
                        console.log(`Retry received asset data:`, {
                          dataLength: data?.length || 0,
                          isArray: Array.isArray(data),
                          isEmpty: Array.isArray(data) && data.length === 0,
                          sampleData: Array.isArray(data) && data.length > 0 ? {
                            id: data[0].uniqueforwardassetid,
                            name: data[0].asset_name,
                            subsector: data[0].subsector
                          } : null,
                          rawData: data // Log the raw data for inspection
                        });
                        
                        // The API should return the assets array directly
                        if (Array.isArray(data)) {
                          // Clean up any remaining NaN values
                          const cleanData = data.map(asset => {
                            const cleanAsset = { ...asset };
                            // Replace any NaN values with null
                            Object.keys(cleanAsset).forEach(key => {
                              if (cleanAsset[key] !== null && typeof cleanAsset[key] === 'number' && isNaN(cleanAsset[key])) {
                                cleanAsset[key] = null;
                              }
                            });
                            return cleanAsset;
                          });
                          
                          setAssetData(cleanData);
                        } else {
                          console.warn('Retry asset data is not an array:', data);
                          setAssetData([]);
                        }
                      } catch (error) {
                        console.error("Error in retry fetch:", error);
                        setAssetData([]);
                      } finally {
                        setIsLoadingAssets(false);
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Card>
  )
}