"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

// Mapping for scenario names to file name parts
const scenarioToFileNameMap: { [key: string]: string } = {
  "maturity": "maturity",
  "emission_factor": "emission_intensity",
  "benefits_cost_maturity": "benefits_costs"
}

// Scenario labels
const scenarioLabels: { [key: string]: string } = {
  "maturity": "By Power Plant Maturity",
  "emission_factor": "By Power Plant Emission Intensity",
  "benefits_cost_maturity": "By Power Plant Benefits/Costs (Including Plant Maturity)"
}

// Country names mapping
const COUNTRY_NAMES: { [key: string]: string } = {
  'EGY': 'Egypt',
  'IDN': 'Indonesia',
  'IND': 'India',
  'IRN': 'Iran',
  'KEN': 'Kenya',
  'MEX': 'Mexico',
  'NGA': 'Nigeria',
  'THA': 'Thailand',
  'TZA': 'Tanzania',
  'UGA': 'Uganda',
  'VNM': 'Vietnam',
  'ZAF': 'South Africa'
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

export default function AssetDetailsPage() {
  const searchParams = useSearchParams()
  const country = searchParams?.get("country") || "UGA"
  const scenario = searchParams?.get("scenario") || "maturity"
  
  const [assetData, setAssetData] = useState<AssetData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string>("amount_mtco2")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [searchTerm, setSearchTerm] = useState<string>("")

  // Fetch asset data when country or scenario changes
  useEffect(() => {
    const fetchAssetData = async () => {
      setIsLoading(true);
      try {
        console.log(`Fetching asset data for ${country} with scenario ${scenario}`);
        // Use the asset-data API route
        const response = await fetch(`/api/asset-data?country=${country}&scenario=${scenarioToFileNameMap[scenario]}`);
        
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
          } : null
        });
        
        // The API should always return an array (either directly or from data.assets)
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
        setError("Failed to load asset data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (country) {
      fetchAssetData();
    }
  }, [country, scenario]);

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

  const countryName = COUNTRY_NAMES[country] || country;
  const scenarioLabel = scenarioLabels[scenario] || scenario;

  return (
    <div className="min-h-screen bg-[#1A2A1A]">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-white hover:text-blue-300">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
        
        <Card className="mb-6 bg-[#2A3A2A] border-[#4A5A4A]">
          <CardHeader>
            <CardTitle>Asset Details for {countryName} - {scenarioLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#3A4A3A] p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-medium mt-1">{totalAssets}</p>
              </div>
              <div className="bg-[#3A4A3A] p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total Capacity</p>
                <p className="text-2xl font-medium mt-1">{totalCapacity.toFixed(0)} MW</p>
              </div>
              <div className="bg-[#3A4A3A] p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total Emissions</p>
                <p className="text-2xl font-medium mt-1">{totalAssetEmissions.toFixed(1)} Mt</p>
              </div>
            </div>
            
            {/* Search Box */}
            <div className="mb-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search assets by name, type, status, capacity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8"
                />
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 absolute left-2 top-3 text-gray-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                  />
                </svg>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-3 text-gray-400 hover:text-gray-200"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M6 18L18 6M6 6l12 12" 
                      />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-foreground">
                  Showing {filteredAssetData.length} of {assetData.length} assets
                </span>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm("")}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading asset data...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-red-500 mb-2">{error}</p>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                >
                  Retry
                </Button>
              </div>
            ) : assetData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-12 w-12 text-gray-400 mb-3" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1} 
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
                <p className="text-sm text-muted-foreground mb-2">No asset data available for this scenario.</p>
                <p className="text-xs text-muted-foreground">
                  We're trying to fetch data from:<br/>
                  <code className="bg-[#3A4A3A] px-2 py-1 rounded text-[10px] mt-1 inline-block">
                    {country}_{scenarioToFileNameMap[scenario]}_asset_info.json
                  </code>
                </p>
              </div>
            ) : (
              <div className="overflow-auto rounded-md border border-[#4A5A4A]" style={{ maxHeight: '350px' }}>
                <table className="w-full text-sm">
                  <thead className="bg-[#3A4A3A] sticky top-0 z-10">
                    <tr>
                      <th 
                        className="p-2 text-left cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("asset_name")}
                      >
                        Name {sortField === "asset_name" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-left cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("subsector")}
                      >
                        Type {sortField === "subsector" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-right cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("Capacity")}
                      >
                        Capacity (MW) {sortField === "Capacity" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-right cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("amount_mtco2")}
                      >
                        Emissions (Mt) {sortField === "amount_mtco2" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-right cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("Start_Year")}
                      >
                        Start Year {sortField === "Start_Year" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-center cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("Status")}
                      >
                        Status {sortField === "Status" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssetData.length > 0 ? (
                      filteredAssetData.map((asset, index) => (
                        <tr key={asset.uniqueforwardassetid + index} className={index % 2 === 0 ? "bg-[#2A3A2A]" : "bg-[#2F3A2F]"}>
                          <td className="p-2 truncate max-w-[200px]" title={asset.asset_name}>{asset.asset_name || 'N/A'}</td>
                          <td className="p-2">{asset.subsector || 'N/A'}</td>
                          <td className="p-2 text-right">{asset.Capacity ? asset.Capacity.toFixed(0) : 'N/A'}</td>
                          <td className="p-2 text-right">{asset.amount_mtco2 ? asset.amount_mtco2.toFixed(3) : 'N/A'}</td>
                          <td className="p-2 text-right">{asset.Start_Year || 'N/A'}</td>
                          <td className="p-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                              asset.Status === 'operating' ? 'bg-green-800 text-green-100' : 
                              asset.Status === 'construction' ? 'bg-yellow-700 text-yellow-100' : 
                              'bg-gray-700 text-gray-100'
                            }`}>
                              {asset.Status || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">
                          No assets match your search criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subsector Breakdown */}
          <Card className="p-4 bg-[#2F3A2F] dark:bg-[#2F3A2F] border-[#4A5A4A]">
            <h3 className="text-lg font-semibold mb-3">Subsector Breakdown</h3>
            <div className="space-y-3">
              {subsectorCounts.map((item) => (
                <div key={item.subsector}>
                  <div className="flex justify-between items-center text-sm">
                    <span>{item.subsector}</span>
                    <span className="font-medium">{item.count} plants ({item.capacity.toFixed(0)} MW)</span>
                  </div>
                  <div className="w-full bg-[#4A5A4A] h-2 rounded-full mt-1">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${(item.count / totalAssets) * 100}%`,
                        backgroundColor: 
                          item.subsector === 'Coal' ? "#0194C5" : 
                          item.subsector === 'Gas' ? "#319B9D" : 
                          item.subsector === 'Oil' ? "#e9c46a" : '#888888'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          
          {/* Emissions Breakdown */}
          <Card className="p-4 bg-[#2F3A2F] dark:bg-[#2F3A2F] border-[#4A5A4A]">
            <h3 className="text-lg font-semibold mb-3">Emissions Breakdown</h3>
            <div className="space-y-3">
              {subsectorCounts.map((item) => (
                <div key={`emissions-${item.subsector}`}>
                  <div className="flex justify-between items-center text-sm">
                    <span>{item.subsector}</span>
                    <span className="font-medium">{item.emissions.toFixed(2)} MtCO2</span>
                  </div>
                  <div className="w-full bg-[#4A5A4A] h-2 rounded-full mt-1">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${(item.emissions / totalAssetEmissions) * 100}%`,
                        backgroundColor: 
                          item.subsector === 'Coal' ? "#0194C5" : 
                          item.subsector === 'Gas' ? "#319B9D" : 
                          item.subsector === 'Oil' ? "#e9c46a" : '#888888'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        
        {/* Return to Dashboard button at the bottom center */}
        <div className="flex justify-center mt-8">
          <Link href="/dashboard">
            <Button variant="outline" className="w-auto">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 