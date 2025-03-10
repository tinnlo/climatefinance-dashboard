import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const response = await fetch(
      "https://fapublicdata.blob.core.windows.net/fa-public-data/country_info/country_info_list.json",
      {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Log the data for debugging
    console.log('API Response:', {
      totalCountries: data.length,
      firstFew: data.slice(0, 3),
      hasIndia: data.some((c: any) => c.Country_ISO3 === 'IND')
    })
    
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Error fetching country info:', error)
    return NextResponse.json({ error: "Failed to fetch country info" }, { status: 500 })
  }
} 