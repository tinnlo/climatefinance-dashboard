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

  if (!country) {
    return NextResponse.json({ error: "Country parameter is required" }, { status: 400 })
  }

  // Convert to ISO3 if not already
  const iso3Code = country.length === 3 ? country.toUpperCase() : convertToIso3(country)
  
  // Get the ISO2 code from our mapping
  const iso2Code = iso3ToIso2Map[iso3Code] || iso3Code.slice(0, 2)
  
  // Construct the URL using the ISO2 code
  const url = `https://fapublicdata.blob.core.windows.net/fa-public-data/phase_out_bar_charts/phaseout_data_${iso2Code}.json`

  console.log('Attempting to fetch data from:', url, {
    originalCountry: country,
    iso3Code,
    iso2Code
  })

  try {
    const response = await fetch(url, {
      cache: 'no-store' // Disable caching to ensure fresh data
    })
    if (!response.ok) {
      console.error(`Failed to fetch data:`, {
        status: response.status,
        statusText: response.statusText,
        url,
        country: iso2Code
      })
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Log successful data fetch
    console.log('Successfully fetched data for country:', {
      country: iso2Code,
      url,
      scenariosAvailable: data.scenarios ? Object.keys(data.scenarios) : 'none',
      dataSize: JSON.stringify(data).length
    })
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching phase-out data:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      country,
      iso3Code,
      iso2Code,
      url,
      stack: error instanceof Error ? error.stack : undefined
    })
    // Return an empty data structure instead of an error
    return NextResponse.json({
      country_code: convertToIso3(country),
      country_name: country,
      scenarios: {}
    })
  }
}

