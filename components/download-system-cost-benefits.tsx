"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useSearchParamsContext } from "@/app/components/SearchParamsProvider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Country names mapping for display and CSV
const COUNTRY_MAP: { [key: string]: string } = {
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
};

export function DownloadSystemCostBenefits() {
  const searchParams = useSearchParamsContext()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  
  // Force the country code to be uppercase for consistency
  const initialCountry = searchParams?.get("country") || "IND"
  const [selectedCountry, setSelectedCountry] = useState(initialCountry.toUpperCase())
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState(searchParams?.get("timeHorizon") || "2035")
  const [isDownloading, setIsDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState("investment-needs")
  
  // Check authentication status
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?returnTo=${encodeURIComponent(currentPath)}`);
    }
  }, [isAuthenticated, isLoading, router])

  // If still loading auth state, show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // If not authenticated, show nothing (will be redirected)
  if (!isAuthenticated) {
    return null
  }

  // SCC options for the dropdown
  const sccOptions = [
    { value: "80", label: "80 USD" },
    { value: "190", label: "190 USD" },
    { value: "1056", label: "1056 USD" },
  ]

  // Time horizons for the dropdown
  const timeHorizons = [
    { value: "2035", label: "Until 2035" },
    { value: "2050", label: "Until 2050" },
  ]

  const handleDownloadInvestmentNeeds = async () => {
    setIsDownloading(true);
    try {
      // Fetch the data from our API
      const response = await fetch(`/api/system-cost-benefits?country=${selectedCountry}&scc=80&timeHorizon=${selectedTimeHorizon}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      // Get country name for display
      const countryName = COUNTRY_MAP[selectedCountry] || selectedCountry;
      
      // Create CSV content for Investment Needs
      const csvContent = `Country,TimeHorizon,Category,Value
${countryName},${selectedTimeHorizon},Phase-out Costs,${data.costs[0].value.toFixed(4)}
${countryName},${selectedTimeHorizon},Renewable Energy,${data.costs[1].value.toFixed(4)}
${countryName},${selectedTimeHorizon},Infrastructure,${data.costs[2].value.toFixed(4)}
${countryName},${selectedTimeHorizon},Total Cost,${data.totalCost.toFixed(4)}
${countryName},${selectedTimeHorizon},Privately Financed,${(data.totalCost * (2/3)).toFixed(4)}
${countryName},${selectedTimeHorizon},Publicly Financed,${(data.totalCost * (1/3)).toFixed(4)}`;

      // Create a blob and download it
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `investment_needs_${selectedCountry}_${selectedTimeHorizon}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      // Handle error here
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadReducedDamages = async () => {
    setIsDownloading(true);
    try {
      // Array to store data for all SCC values
      const allSccData = [];
      const sccValues = sccOptions.map(scc => scc.value);
      
      // Get country name for display
      const countryName = COUNTRY_MAP[selectedCountry] || selectedCountry;
      
      // Fetch data for all SCC values for the selected time horizon
      for (const scc of sccValues) {
        const response = await fetch(`/api/system-cost-benefits?country=${selectedCountry}&scc=${scc}&timeHorizon=${selectedTimeHorizon}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data for SCC ${scc}`);
        }
        
        const data = await response.json();
        allSccData.push({
          scc,
          airPollutionBenefit: data.airPollutionBenefit,
          countryBenefit: data.countryBenefit,
          worldBenefit: data.worldBenefit,
          totalBenefit: data.totalBenefit
        });
      }
      
      // Create CSV content for all SCC values
      let csvContent = "Country,SCC,TimeHorizon,Category,Value\n";
      
      // Add data rows for all SCC values
      allSccData.forEach(data => {
        csvContent += `${countryName},${data.scc},${selectedTimeHorizon},Reduced Air Pollution Damages,${data.airPollutionBenefit.toFixed(4)}\n`;
        csvContent += `${countryName},${data.scc},${selectedTimeHorizon},Domestic Damage Reduction,${data.countryBenefit.toFixed(4)}\n`;
        csvContent += `${countryName},${data.scc},${selectedTimeHorizon},Global Damage Reduction,${data.worldBenefit.toFixed(4)}\n`;
        csvContent += `${countryName},${data.scc},${selectedTimeHorizon},Total Benefit,${data.totalBenefit.toFixed(4)}\n`;
      });

      // Create a blob and download it
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `reduced_damages_${selectedCountry}_all_scc_${selectedTimeHorizon}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      // Handle error here
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadComplete = async () => {
    setIsDownloading(true);
    try {
      // Arrays to store all data for different time horizons and SCC values
      const allData = [];
      const timeHorizonValues = timeHorizons.map(th => th.value);
      const sccValues = sccOptions.map(scc => scc.value);
      
      // Get country name for display
      const countryName = COUNTRY_MAP[selectedCountry] || selectedCountry;
      
      // Fetch data for all combinations of time horizons and SCC values
      for (const timeHorizon of timeHorizonValues) {
        for (const scc of sccValues) {
          const response = await fetch(`/api/system-cost-benefits?country=${selectedCountry}&scc=${scc}&timeHorizon=${timeHorizon}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch data for time horizon ${timeHorizon} and SCC ${scc}`);
          }
          
          const data = await response.json();
          allData.push({
            timeHorizon,
            scc,
            costs: data.costs,
            totalCost: data.totalCost,
            airPollutionBenefit: data.airPollutionBenefit,
            countryBenefit: data.countryBenefit,
            worldBenefit: data.worldBenefit,
            totalBenefit: data.totalBenefit
          });
        }
      }
      
      // Create CSV header
      let csvContent = "Country,SCC,TimeHorizon,Category,Value\n";
      
      // Add data rows for all combinations
      allData.forEach(data => {
        // Investment needs data (same for all SCC values within a time horizon)
        if (!csvContent.includes(`${countryName},,${data.timeHorizon},Phase-out Costs`)) {
          csvContent += `${countryName},,${data.timeHorizon},Phase-out Costs,${data.costs[0].value.toFixed(4)}\n`;
          csvContent += `${countryName},,${data.timeHorizon},Renewable Energy,${data.costs[1].value.toFixed(4)}\n`;
          csvContent += `${countryName},,${data.timeHorizon},Infrastructure,${data.costs[2].value.toFixed(4)}\n`;
          csvContent += `${countryName},,${data.timeHorizon},Total Cost,${data.totalCost.toFixed(4)}\n`;
          csvContent += `${countryName},,${data.timeHorizon},Privately Financed,${(data.totalCost * (2/3)).toFixed(4)}\n`;
          csvContent += `${countryName},,${data.timeHorizon},Publicly Financed,${(data.totalCost * (1/3)).toFixed(4)}\n`;
        }
        
        // Reduced damages data (varies by both time horizon and SCC)
        csvContent += `${countryName},${data.scc},${data.timeHorizon},Reduced Air Pollution Damages,${data.airPollutionBenefit.toFixed(4)}\n`;
        csvContent += `${countryName},${data.scc},${data.timeHorizon},Domestic Damage Reduction,${data.countryBenefit.toFixed(4)}\n`;
        csvContent += `${countryName},${data.scc},${data.timeHorizon},Global Damage Reduction,${data.worldBenefit.toFixed(4)}\n`;
        csvContent += `${countryName},${data.scc},${data.timeHorizon},Total Benefit,${data.totalBenefit.toFixed(4)}\n`;
      });

      // Create a blob and download it
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `complete_data_${selectedCountry}_all_scenarios.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      // Handle error here
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A2A1A]">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Breadcrumb navigation */}
        <div className="flex items-center mb-6">
          <Link 
            href="/dashboard" 
            className="flex items-center text-white hover:text-blue-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-8 text-white">Download Investment Needs & Reduced Damages Data</h1>
        
        <Card className="mb-8 bg-[#2A3A2A] border-[#4A5A4A]">
          <CardHeader>
            <CardTitle>Select Data Parameters</CardTitle>
            <CardDescription>Choose the country and time horizon for the data you want to download</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Select 
                  value={selectedCountry}
                  onValueChange={(value) => setSelectedCountry(value.toUpperCase())}
                >
                  <SelectTrigger className="bg-[#3A4A3A] border-[#4A5A4A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A3A2A] border-[#4A5A4A]">
                    <SelectItem value="IND">India</SelectItem>
                    <SelectItem value="IDN">Indonesia</SelectItem>
                    <SelectItem value="ZAF">South Africa</SelectItem>
                    <SelectItem value="VNM">Vietnam</SelectItem>
                    <SelectItem value="IRN">Iran</SelectItem>
                    <SelectItem value="MEX">Mexico</SelectItem>
                    <SelectItem value="NGA">Nigeria</SelectItem>
                    <SelectItem value="EGY">Egypt</SelectItem>
                    <SelectItem value="KEN">Kenya</SelectItem>
                    <SelectItem value="TZA">Tanzania</SelectItem>
                    <SelectItem value="THA">Thailand</SelectItem>
                    <SelectItem value="UGA">Uganda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Time Horizon</label>
                <Select value={selectedTimeHorizon} onValueChange={setSelectedTimeHorizon}>
                  <SelectTrigger className="bg-[#3A4A3A] border-[#4A5A4A]">
                    <SelectValue placeholder="Select time horizon" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A3A2A] border-[#4A5A4A]">
                    {timeHorizons.map((horizon) => (
                      <SelectItem key={horizon.value} value={horizon.value}>
                        {horizon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-8 bg-[#2A3A2A] border-[#4A5A4A]">
          <CardHeader>
            <CardTitle>Download Dataset for {COUNTRY_MAP[selectedCountry]}</CardTitle>
            <CardDescription>Select which dataset you want to download</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs 
              defaultValue="investment-needs" 
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="investment-needs" className="text-sm">Investment Needs</TabsTrigger>
                <TabsTrigger value="reduced-damages" className="text-sm">Reduced Damages</TabsTrigger>
              </TabsList>
              
              <TabsContent value="investment-needs" className="space-y-4">
                <div className="border rounded-lg divide-y border-[#4A5A4A] bg-[#3A4A3A]">
                  <div className="p-4">
                    <h3 className="font-medium mb-2 text-white">Investment Needs Components (Time Horizon: {selectedTimeHorizon})</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Phase-out Costs</li>
                      <li>Renewable Energy</li>
                      <li>Infrastructure</li>
                      <li>Total Investment</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border-t border-[#4A5A4A]">
                    <h3 className="font-medium mb-2 text-white">Finance Source</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Privately Financed (2/3 of total cost)</li>
                      <li>Publicly Financed (1/3 of total cost)</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex justify-center mt-4">
                  <Button 
                    onClick={handleDownloadInvestmentNeeds} 
                    variant="outline"
                    className="border-[#4A5A4A] hover:bg-[#4A5A4A] text-white"
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download Investment Needs Data (CSV)
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="reduced-damages" className="space-y-4">
                <div className="border rounded-lg divide-y border-[#4A5A4A] bg-[#3A4A3A]">
                  <div className="p-4">
                    <h3 className="font-medium mb-2 text-white">Reduced Damages Components (Time Horizon: {selectedTimeHorizon})</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Reduced Air Pollution Damages</li>
                      <li>Domestic Damage Reduction</li>
                      <li>Global Damage Reduction</li>
                      <li>Total Benefits</li>
                    </ul>
                  </div>
                  <div className="p-4 border-t border-[#4A5A4A]">
                    <h3 className="font-medium mb-2 text-white">Social Cost of Carbon Values</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>80 USD</li>
                      <li>190 USD</li>
                      <li>1056 USD</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">The CSV will include data for all SCC values</p>
                  </div>
                </div>
                
                <div className="flex justify-center mt-4">
                  <Button 
                    onClick={handleDownloadReducedDamages} 
                    variant="outline"
                    className="border-[#4A5A4A] hover:bg-[#4A5A4A] text-white"
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download Reduced Damages Data (CSV)
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <Card className="mb-8 bg-[#2A3A2A] border-[#4A5A4A]">
          <CardHeader>
            <CardTitle>Complete Dataset</CardTitle>
            <CardDescription>Download all data for all time horizons and SCC values</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg border-[#4A5A4A] bg-[#3A4A3A]">
              <div>
                <h3 className="font-medium">Complete Dataset for {COUNTRY_MAP[selectedCountry]}</h3>
                <p className="text-sm text-muted-foreground">Includes all time horizons and SCC values for both Investment Needs and Reduced Damages</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadComplete}
                disabled={isDownloading}
                className="border-[#4A5A4A] hover:bg-[#4A5A4A]"
              >
                {isDownloading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Return to Dashboard button at the bottom center */}
        <div className="flex justify-center mt-8">
          <Link href="/dashboard">
            <Button variant="outline" className="w-auto border-[#4A5A4A] hover:bg-[#4A5A4A] text-white">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}