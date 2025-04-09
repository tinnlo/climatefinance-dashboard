"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowLeft, InfoIcon } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

interface Owner {
  name: string;
  share_holding: number;
}

interface AssetData {
  name: string;
  uniqueId: string;
  fuel_type: string;
  phase_out_year: number;
  fraction: number;
  emissions: number;
  technology: string | null;
  owner: string | null; // For backward compatibility
  owners: Owner[] | null;
  status: string;
  capacity: number;
  // Derived fields
  allocated_emissions?: number; // Emissions allocated by owner share
}

export default function AssetsDetailsPage() {
  const searchParams = useSearchParams()
  const country = searchParams?.get("country")
  const useFallback = searchParams?.get("fallback") === "true"
  const order = searchParams?.get("order") || "maturity" // Get selected order/scenario
  const router = useRouter()
  
  const [assetsData, setAssetsData] = useState<AssetData[]>([])
  const [processedData, setProcessedData] = useState<AssetData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string>("phase_out_year")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [searchTerm, setSearchTerm] = useState<string>("")
  
  // Redirect to dashboard if no country is provided
  useEffect(() => {
    if (!country) {
      console.log("No country provided, redirecting to dashboard");
      router.push("/dashboard");
    }
  }, [country, router]);

  // Fetch asset data when country changes
  useEffect(() => {
    const fetchAssetData = async () => {
      setIsLoading(true);
      
      if (!country) {
        setError("No country selected. Please select a country from the dashboard.");
        setIsLoading(false);
        return;
      }
      
      try {
        // Ensure we're using the correct ISO3 code
        // The API expects an ISO3 code (3-letter country code)
        console.log(`Original country parameter from URL: ${country}`);
        console.log(`Fallback parameter: ${useFallback}`);
        console.log(`Order parameter: ${order}`);
        
        let finalData = null;
        
        // Try the map-data API first if fallback is requested
        if (useFallback) {
          const mapApiUrl = `/api/map-data?country=${country}&order=${order}`;
          console.log(`Trying map-data API first: ${mapApiUrl}`);
          
          try {
            const mapResponse = await fetch(mapApiUrl, {
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache' }
            });
            
            console.log(`Map API fetch response status: ${mapResponse.status} ${mapResponse.statusText}`);
            
            if (mapResponse.ok) {
              const mapData = await mapResponse.json();
              console.log(`Map data API returned ${mapData?.length || 0} assets`);
              
              if (Array.isArray(mapData) && mapData.length > 0) {
                console.log(`Using map data (scenario: ${order}) as primary data source`);
                finalData = mapData;
              }
            }
          } catch (mapError) {
            console.error("Error fetching from map-data API:", mapError);
          }
        }
        
        // If no data yet or fallback is false, try the phase-out-assets API
        if (!finalData) {
          const apiUrl = `/api/phase-out-assets?country=${country}`;
          console.log(`Trying phase-out-assets API: ${apiUrl}`);
          
          const response = await fetch(apiUrl, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          console.log(`Phase-out assets API response status: ${response.status} ${response.statusText}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Phase-out assets API returned ${data?.length || 0} assets`);
            
            if (Array.isArray(data) && data.length > 0) {
              finalData = data;
            }
          } else {
            console.error(`HTTP error fetching assets data! status: ${response.status}`);
            
            // Only throw if we don't have data from map-data API
            if (!finalData) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
          }
        }
        
        // Log detailed information about the final data
        console.log(`Final data choice:`, {
          dataLength: finalData?.length || 0,
          isArray: Array.isArray(finalData),
          isEmpty: Array.isArray(finalData) && finalData.length === 0,
          uniqueYears: Array.isArray(finalData) 
            ? Array.from(new Set(finalData.map((asset: any) => asset.phase_out_year))).sort() 
            : [],
          source: finalData ? (useFallback ? "map-data API" : "phase-out-assets API") : "none"
        });
        
        if (finalData) {
          setAssetsData(finalData);
        } else {
          console.warn('No assets data available from any source');
          setAssetsData([]);
        }
      } catch (error) {
        console.error("Error fetching assets data:", error);
        setAssetsData([]);
        setError(`Failed to load assets data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (country) {
      fetchAssetData();
    }
  }, [country, useFallback, order]);

  // Process data to handle multiple owners and allocate emissions for all years
  useEffect(() => {
    if (!assetsData.length) {
      setProcessedData([]);
      return;
    }

    console.log(`Processing data for all years, total assets: ${assetsData.length}`);

    // Create expanded records with owner allocations
    const expandedData: AssetData[] = [];
    
    assetsData.forEach(asset => {
      if (asset.owners && asset.owners.length > 0) {
        // For each owner, create a separate record with allocated emissions
        asset.owners.forEach(owner => {
          const allocated_emissions = asset.emissions * owner.share_holding;
          
          expandedData.push({
            ...asset,
            owner: owner.name, // Use the owner name for display
            allocated_emissions: allocated_emissions
          });
        });
      } else if (asset.owner) {
        // For backward compatibility - single owner
        expandedData.push({
          ...asset,
          allocated_emissions: asset.emissions
        });
      }
    });
    
    console.log(`Processed data: ${expandedData.length} records after owner allocation`);
    setProcessedData(expandedData);
  }, [assetsData]);

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
  const sortedData = [...processedData].sort((a, b) => {
    let aValue: any, bValue: any;
    
    // Handle special case for allocated_emissions
    if (sortField === "allocated_emissions") {
      aValue = a.allocated_emissions || 0;
      bValue = b.allocated_emissions || 0;
    } else if (sortField === "owner") {
      aValue = a.owner || "";
      bValue = b.owner || "";
    } else {
      aValue = a[sortField as keyof AssetData];
      bValue = b[sortField as keyof AssetData];
    }
    
    // Handle null/undefined values
    if (aValue === null || aValue === undefined) aValue = sortDirection === "asc" ? Number.MAX_VALUE : Number.MIN_VALUE;
    if (bValue === null || bValue === undefined) bValue = sortDirection === "asc" ? Number.MAX_VALUE : Number.MIN_VALUE;
    
    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === "asc" 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }
    
    // Handle number comparison
    const comparison = sortDirection === "asc" 
      ? (aValue as number) - (bValue as number) 
      : (bValue as number) - (aValue as number);
    
    // Secondary sort by asset name when primary sort field is phase_out_year
    if (sortField === "phase_out_year" && comparison === 0) {
      const aName = a.name || "";
      const bName = b.name || "";
      return aName.localeCompare(bName);
    }
    
    return comparison;
  });

  // Filter assets based on search term
  const filteredData = sortedData.filter(asset => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (asset.name?.toLowerCase().includes(term) || false) ||
      (asset.owner?.toLowerCase().includes(term) || false) ||
      (asset.fuel_type?.toLowerCase().includes(term) || false) ||
      (String(asset.emissions || '').includes(term)) ||
      (asset.phase_out_year && String(asset.phase_out_year).includes(term)) ||
      (String(asset.capacity || '').includes(term))
    );
  });

  // Group assets by fuel type
  const assetsByFuelType = processedData.reduce((acc, asset) => {
    const fuelType = asset.fuel_type || 'Unknown';
    if (!acc[fuelType]) {
      acc[fuelType] = [];
    }
    acc[fuelType].push(asset);
    return acc;
  }, {} as Record<string, AssetData[]>);

  // Calculate asset statistics
  const uniqueAssets = new Set(processedData.map(asset => asset.uniqueId)).size;
  const uniqueCompanies = new Set(processedData.map(asset => asset.owner)).size;
  const totalCapacity = processedData.reduce((sum, asset) => sum + (asset.capacity || 0), 0);
  const totalEmissions = processedData.reduce((sum, asset) => sum + (asset.emissions || 0), 0);
  const totalAllocatedEmissions = processedData.reduce((sum, asset) => sum + (asset.allocated_emissions || 0), 0);
  
  const fuelTypeCounts = Object.entries(assetsByFuelType).map(([fuelType, assets]) => ({
    fuelType,
    count: assets.length,
    capacity: assets.reduce((sum, asset) => sum + (asset.capacity || 0), 0),
    emissions: assets.reduce((sum, asset) => sum + (asset.emissions || 0), 0),
    allocatedEmissions: assets.reduce((sum, asset) => sum + (asset.allocated_emissions || 0), 0)
  })).sort((a, b) => b.count - a.count);

  const countryName = country ? (COUNTRY_NAMES[country] || country) : 'Selected Country';

  // Map order value to a readable name
  const getScenarioName = (orderValue: string) => {
    switch(orderValue) {
      case 'maturity': return 'Power Plant Maturity';
      case 'emission_factor': return 'Power Plant Emission Intensity';
      case 'benefits_cost_maturity': return 'Power Plant Benefits/Costs';
      default: return orderValue;
    }
  };

  const scenarioName = getScenarioName(order);

  // Add status badge styling
  const getStatusBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'operating':
        return 'bg-[#7a9e7d] text-white'; // Light Forest Green
      case 'planned':
        return 'bg-[#0194C5] text-white'; // Blue
      case 'construction':
        return 'bg-[#e9c46a] text-black'; // Yellow
      default:
        return 'bg-[#4A5A4A] text-white'; // Dark gray
    }
  };

  return (
    <div className="min-h-screen bg-[#1A2A1A]">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-white hover:text-blue-300">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
        
        <Card className="mb-6 bg-[#2A3A2A] border-[#4A5A4A]">
          <CardHeader>
            <CardTitle>Asset Details for {countryName} - {scenarioName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#3A4A3A] p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-medium mt-1">{uniqueAssets}</p>
              </div>
              <div className="bg-[#3A4A3A] p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Companies Involved</p>
                <p className="text-2xl font-medium mt-1">{uniqueCompanies}</p>
              </div>
              <div className="bg-[#3A4A3A] p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total Emissions</p>
                <p className="text-2xl font-medium mt-1">{totalEmissions.toFixed(2)} Mt</p>
              </div>
            </div>
            
            {/* Search Box */}
            <div className="mb-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search assets by name, owner, fuel type, year..."
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
                  Showing {filteredData.length} of {processedData.length} rows ({uniqueAssets} unique assets)
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
                <p className="text-sm text-muted-foreground">Loading assets data...</p>
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
            ) : processedData.length === 0 ? (
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
                <p className="text-sm text-muted-foreground mb-2">No assets data available for this country.</p>
              </div>
            ) : (
              <div className="overflow-auto rounded-md border border-[#4A5A4A]" style={{ maxHeight: '350px' }}>
                <table className="w-full text-sm">
                  <thead className="bg-[#3A4A3A] sticky top-0 z-10">
                    <tr>
                      <th 
                        className="p-2 text-left cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("phase_out_year")}
                      >
                        Year {sortField === "phase_out_year" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-left cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("name")}
                      >
                        Asset Name {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-center cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("fuel_type")}
                      >
                        Fuel Type {sortField === "fuel_type" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-center cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("status")}
                      >
                        Status {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-left cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("owner")}
                      >
                        Owner {sortField === "owner" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-right cursor-pointer hover:bg-[#4A5A4A]" 
                      >
                        Shareholding
                      </th>
                      <th 
                        className="p-2 text-right cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("allocated_emissions")}
                      >
                        Allocated Emissions (Mt) {sortField === "allocated_emissions" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-right cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("fraction")}
                      >
                        Phased out % {sortField === "fraction" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length > 0 ? (
                      filteredData.map((asset, index) => (
                        <tr key={`${asset.uniqueId}-${asset.owner}-${index}`} className={index % 2 === 0 ? "bg-[#2A3A2A]" : "bg-[#2F3A2F]"}>
                          <td className="p-2 text-left">
                            {asset.phase_out_year || 'N/A'}
                          </td>
                          <td className="p-2 truncate max-w-[200px]" title={asset.name}>{asset.name || 'N/A'}</td>
                          <td className="p-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                              asset.fuel_type === 'Coal' ? 'bg-[#0194C5] text-white' : 
                              asset.fuel_type === 'Gas' ? 'bg-[#319B9D] text-white' : 
                              asset.fuel_type === 'Oil' ? 'bg-[#e9c46a] text-black' : 
                              'bg-gray-700 text-gray-100'
                            }`}>
                              {asset.fuel_type || 'N/A'}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${getStatusBadgeStyle(asset.status)}`}>
                              {asset.status || 'N/A'}
                            </span>
                          </td>
                          <td className="p-2 truncate max-w-[150px]" title={asset.owner || ''}>
                            {asset.owner || 'N/A'}
                          </td>
                          <td className="p-2 text-right">
                            {asset.owners && asset.owners.length > 0 
                              ? asset.owners.find(o => o.name === asset.owner)?.share_holding 
                                ? (asset.owners.find(o => o.name === asset.owner)!.share_holding * 100).toFixed(1) + '%'
                                : '100.0%'
                              : '100.0%'
                            }
                          </td>
                          <td className="p-2 text-right">{asset.allocated_emissions ? asset.allocated_emissions.toFixed(4) : 'N/A'}</td>
                          <td className="p-2 text-right">
                            {asset.fraction !== undefined ? (asset.fraction * 100).toFixed(1) : '100.0'}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-muted-foreground">
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
          {/* Fuel Type Distribution */}
          <Card className="p-4 bg-[#2F3A2F] dark:bg-[#2F3A2F] border-[#4A5A4A]">
            <h3 className="text-lg font-semibold mb-3">Fuel Type Distribution</h3>
            <div className="space-y-3">
              {fuelTypeCounts.map((item) => (
                <div key={item.fuelType}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="capitalize">{item.fuelType}</span>
                    <span className="font-medium">{item.count} assets ({((item.count / processedData.length) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-[#4A5A4A] h-2 rounded-full mt-1">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${(item.count / processedData.length) * 100}%`,
                        backgroundColor: 
                          item.fuelType === 'Coal' ? "#0194C5" : 
                          item.fuelType === 'Gas' ? "#319B9D" : 
                          item.fuelType === 'Oil' ? "#e9c46a" : 
                          '#888888'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          
          {/* Emissions Distribution */}
          <Card className="p-4 bg-[#2F3A2F] dark:bg-[#2F3A2F] border-[#4A5A4A]">
            <h3 className="text-lg font-semibold mb-3">Emissions Distribution</h3>
            <div className="space-y-3">
              {fuelTypeCounts.map((item) => (
                <div key={`emissions-${item.fuelType}`}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="capitalize">{item.fuelType}</span>
                    <span className="font-medium">{item.allocatedEmissions.toFixed(2)} MtCO2</span>
                  </div>
                  <div className="w-full bg-[#4A5A4A] h-2 rounded-full mt-1">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${totalAllocatedEmissions > 0 ? (item.allocatedEmissions / totalAllocatedEmissions) * 100 : 0}%`,
                        backgroundColor: 
                          item.fuelType === 'Coal' ? "#0194C5" : 
                          item.fuelType === 'Gas' ? "#319B9D" : 
                          item.fuelType === 'Oil' ? "#e9c46a" : 
                          '#888888'
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