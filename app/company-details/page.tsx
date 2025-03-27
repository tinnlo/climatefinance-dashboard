"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

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

interface CompanyData {
  Company_Name: string
  Country_ISO3: string
  Status: string
  Capacity_Unit: string
  Emissions_Unit: string
  Capacity: number
  Emissions: number
}

export default function CompanyDetailsPage() {
  const searchParams = useSearchParams()
  const country = searchParams?.get("country")
  const router = useRouter()
  
  const [companyData, setCompanyData] = useState<CompanyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string>("Emissions")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [searchTerm, setSearchTerm] = useState<string>("")

  // Redirect to dashboard if no country is provided
  useEffect(() => {
    if (!country) {
      console.log("No country provided, redirecting to dashboard");
      router.push("/dashboard");
    }
  }, [country, router]);

  // Fetch company data when country changes
  useEffect(() => {
    const fetchCompanyData = async () => {
      setIsLoading(true);
      
      if (!country) {
        setError("No country selected. Please select a country from the dashboard.");
        setIsLoading(false);
        return;
      }
      
      try {
        console.log(`Fetching company data for ${country}`);
        // Use the company-data API route
        const response = await fetch(`/api/company-data?country=${country}`);
        
        if (!response.ok) {
          console.error(`HTTP error fetching company data! status: ${response.status}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Log detailed information about the received data
        console.log(`Received company data:`, {
          dataLength: data?.length || 0,
          isArray: Array.isArray(data),
          isEmpty: Array.isArray(data) && data.length === 0,
          sampleData: Array.isArray(data) && data.length > 0 ? {
            name: data[0].Company_Name,
            status: data[0].Status,
            capacity: data[0].Capacity
          } : null
        });
        
        if (Array.isArray(data)) {
          // Clean up any remaining NaN values
          const cleanData = data.map(company => {
            const cleanCompany = { ...company };
            // Replace any NaN values with null
            Object.keys(cleanCompany).forEach(key => {
              if (cleanCompany[key] !== null && typeof cleanCompany[key] === 'number' && isNaN(cleanCompany[key])) {
                cleanCompany[key] = null;
              }
            });
            return cleanCompany;
          });
          
          setCompanyData(cleanData);
        } else {
          console.warn('Company data is not an array:', data);
          setCompanyData([]);
        }
      } catch (error) {
        console.error("Error fetching company data:", error);
        setCompanyData([]);
        setError("Failed to load company data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (country) {
      fetchCompanyData();
    }
  }, [country]);

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

  // Sort the company data
  const sortedCompanyData = [...companyData].sort((a, b) => {
    let aValue = a[sortField as keyof CompanyData]
    let bValue = b[sortField as keyof CompanyData]
    
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

  // Filter companies based on search term
  const filteredCompanyData = sortedCompanyData.filter(company => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (company.Company_Name?.toLowerCase().includes(term) || false) ||
      (company.Status?.toLowerCase().includes(term) || false) ||
      (company.Country_ISO3?.toLowerCase().includes(term) || false) ||
      (String(company.Capacity || '').includes(term)) ||
      (String(company.Emissions || '').includes(term))
    );
  });

  // Group companies by status
  const companiesByStatus = companyData.reduce((acc, company) => {
    const status = company.Status || 'Unknown';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(company);
    return acc;
  }, {} as Record<string, CompanyData[]>);

  // Calculate company statistics
  const uniqueCompanies = new Set(companyData.map(company => company.Company_Name)).size;
  const totalCapacity = companyData.reduce((sum, company) => sum + (company.Capacity || 0), 0);
  const totalEmissions = companyData.reduce((sum, company) => sum + (company.Emissions || 0), 0);
  const statusCounts = Object.entries(companiesByStatus).map(([status, companies]) => ({
    status,
    count: companies.length,
    capacity: companies.reduce((sum, company) => sum + (company.Capacity || 0), 0),
    emissions: companies.reduce((sum, company) => sum + (company.Emissions || 0), 0)
  })).sort((a, b) => b.count - a.count);

  const countryName = country ? (COUNTRY_NAMES[country] || country) : 'Selected Country';

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
            <CardTitle>Company Details for {countryName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#3A4A3A] p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total Companies</p>
                <p className="text-2xl font-medium mt-1">{uniqueCompanies}</p>
              </div>
              <div className="bg-[#3A4A3A] p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total Capacity</p>
                <p className="text-2xl font-medium mt-1">{totalCapacity.toFixed(0)} MW</p>
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
                  placeholder="Search companies by name, status, capacity..."
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
                  Showing {filteredCompanyData.length} of {companyData.length} rows ({uniqueCompanies} unique companies)
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
                <p className="text-sm text-muted-foreground">Loading company data...</p>
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
            ) : companyData.length === 0 ? (
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
                <p className="text-sm text-muted-foreground mb-2">No company data available for this country.</p>
                <p className="text-xs text-muted-foreground">
                  We're trying to fetch data from:<br/>
                  <code className="bg-[#3A4A3A] px-2 py-1 rounded text-[10px] mt-1 inline-block">
                    {country}_company_info.json
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
                        onClick={() => handleSort("Company_Name")}
                      >
                        Company Name {sortField === "Company_Name" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-center cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("Status")}
                      >
                        Status {sortField === "Status" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-right cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("Capacity")}
                      >
                        Capacity (MW) {sortField === "Capacity" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        className="p-2 text-right cursor-pointer hover:bg-[#4A5A4A]" 
                        onClick={() => handleSort("Emissions")}
                      >
                        Emissions (Mt) {sortField === "Emissions" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanyData.length > 0 ? (
                      filteredCompanyData.map((company, index) => (
                        <tr key={`${company.Company_Name}-${index}`} className={index % 2 === 0 ? "bg-[#2A3A2A]" : "bg-[#2F3A2F]"}>
                          <td className="p-2 truncate max-w-[200px]" title={company.Company_Name}>{company.Company_Name || 'N/A'}</td>
                          <td className="p-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                              company.Status === 'operating' ? 'bg-green-800 text-green-100' : 
                              company.Status === 'construction' ? 'bg-yellow-700 text-yellow-100' : 
                              'bg-gray-700 text-gray-100'
                            }`}>
                              {company.Status || 'N/A'}
                            </span>
                          </td>
                          <td className="p-2 text-right">{company.Capacity ? company.Capacity.toFixed(0) : 'N/A'}</td>
                          <td className="p-2 text-right">{company.Emissions ? company.Emissions.toFixed(4) : 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-muted-foreground">
                          No companies match your search criteria
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
          {/* Status Distribution */}
          <Card className="p-4 bg-[#2F3A2F] dark:bg-[#2F3A2F] border-[#4A5A4A]">
            <h3 className="text-lg font-semibold mb-3">Status Distribution</h3>
            <div className="space-y-3">
              {statusCounts.map((item) => (
                <div key={item.status}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="capitalize">{item.status}</span>
                    <span className="font-medium">{item.count} plants ({((item.count / companyData.length) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-[#4A5A4A] h-2 rounded-full mt-1">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${(item.count / companyData.length) * 100}%`,
                        backgroundColor: 
                          item.status === 'operating' ? "#0194C5" : 
                          item.status === 'construction' ? "#319B9D" : 
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
              {statusCounts.map((item) => (
                <div key={`emissions-${item.status}`}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="capitalize">{item.status}</span>
                    <span className="font-medium">{item.emissions.toFixed(2)} MtCO2</span>
                  </div>
                  <div className="w-full bg-[#4A5A4A] h-2 rounded-full mt-1">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${totalEmissions > 0 ? (item.emissions / totalEmissions) * 100 : 0}%`,
                        backgroundColor: 
                          item.status === 'operating' ? "#0194C5" : 
                          item.status === 'construction' ? "#319B9D" : 
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