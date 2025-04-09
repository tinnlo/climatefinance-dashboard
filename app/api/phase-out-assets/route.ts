import { NextResponse } from "next/server"
import { convertToIso3 } from "@/lib/utils"

// ISO3 to ISO2 mapping
const iso3ToIso2Map: { [key: string]: string } = {
  'EGY': 'EG',
  'IDN': 'ID',
  'IND': 'IN',
  'IRN': 'IR',
  'KEN': 'KE',
  'MEX': 'MX',
  'NGA': 'NG',
  'THA': 'TH',
  'TZA': 'TZ',
  'UGA': 'UG',
  'VNM': 'VN',
  'ZAF': 'ZA'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let country = searchParams.get("country")

  console.log('Phase-out assets API called with params:', { 
    url: request.url,
    country, 
    headers: Object.fromEntries(request.headers),
  })

  if (!country) {
    console.error('Country parameter is missing')
    return NextResponse.json({ error: "Country parameter is required" }, { status: 400 })
  }

  // Convert to ISO3 if not already
  const iso3Code = country.length === 3 ? country.toUpperCase() : convertToIso3(country)
  
  // Get the ISO2 code from our mapping
  const iso2Code = iso3ToIso2Map[iso3Code] || iso3Code.slice(0, 2)
  
  // Construct the URL using the ISO2 code - use the asset-level data which includes ownership
  const url = `https://fapublicdata.blob.core.windows.net/fa-public-data/power_plant_assets/asset_data_${iso2Code.toLowerCase()}.json`

  console.log('Attempting to fetch phase-out assets data from:', url, {
    originalCountry: country,
    iso3Code,
    iso2Code,
    fullUrl: url
  })

  try {
    const response = await fetch(url, {
      cache: 'no-store' // Disable caching to ensure fresh data
    })
    
    if (!response.ok) {
      console.error(`Failed to fetch assets data:`, {
        status: response.status,
        statusText: response.statusText,
        url,
        country: iso2Code
      })
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Ensure all assets have valid phase_out_year values
    const validData = Array.isArray(data) ? data.filter((asset: any) => {
      // Check if phase_out_year exists and is a valid number
      const hasValidYear = asset && 
                         asset.phase_out_year !== undefined && 
                         !isNaN(asset.phase_out_year) &&
                         asset.phase_out_year > 2000 && 
                         asset.phase_out_year < 2100; // Basic sanity check
      
      if (!hasValidYear) {
        console.warn(`Filtered out asset with invalid phase_out_year:`, {
          asset_id: asset?.uniqueId,
          name: asset?.name,
          year: asset?.phase_out_year
        });
      }
      
      return hasValidYear;
    }) : [];
    
    // No year filtering - return all data
    
    // Log successful data fetch
    console.log('Successfully fetched assets data for country:', {
      country: iso2Code,
      url,
      totalAssets: validData.length,
      originalCount: data?.length || 0,
      filteredOut: (data?.length || 0) - validData.length,
      yearRange: validData.length > 0 ? {
        min: Math.min(...validData.map((asset: any) => asset.phase_out_year)),
        max: Math.max(...validData.map((asset: any) => asset.phase_out_year))
      } : null,
      yearCounts: validData.length > 0 ? 
        Array.from(new Set(validData.map((asset: any) => asset.phase_out_year)))
          .sort()
          .map(year => ({ 
            year,
            count: validData.filter((asset: any) => asset.phase_out_year === year).length
          })) : [],
      firstAsset: validData.length > 0 ? {
        name: validData[0].name,
        year: validData[0].phase_out_year,
        hasOwners: Boolean(validData[0].owners),
        hasFraction: validData[0].fraction !== undefined
      } : null
    })
    
    return NextResponse.json(validData)
  } catch (error) {
    console.error("Error fetching phase-out assets data:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      country,
      iso3Code,
      iso2Code,
      url,
      stack: error instanceof Error ? error.stack : undefined
    })
    // Return an empty array instead of an error
    return NextResponse.json([])
  }
} 