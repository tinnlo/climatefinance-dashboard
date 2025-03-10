import { NextResponse } from "next/server"
import { convertToIso3 } from "@/lib/utils"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let country = searchParams.get("country")
  const order = searchParams.get("order") || "maturity"

  if (!country) {
    return NextResponse.json({ error: "Country parameter is required" }, { status: 400 })
  }

  // Convert to ISO3
  const iso3Code = convertToIso3(country)

  let url: string
  if (iso3Code === "IND") {
    switch (order) {
      case "emission_factor":
        url = "https://fapublicdata.blob.core.windows.net/fa-public-data/phase_out_order_maps/IND_emission_factor_data.json"
        break
      case "emissions_per_OC_maturity":
        url = "https://fapublicdata.blob.core.windows.net/fa-public-data/phase_out_order_maps/IND_emissions_per_OC_maturity_data.json"
        break
      default:
        url = "https://fapublicdata.blob.core.windows.net/fa-public-data/phase_out_order_maps/IND_maturity_data.json"
    }
  } else {
    url = `https://fapublicdata.blob.core.windows.net/fa-public-data/phase_out_order_maps/${iso3Code}_${order}_data.json`
  }

  console.log('Attempting to fetch map data:', {
    originalCountry: country,
    iso3Code,
    order,
    url
  })

  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error('Failed to fetch map data:', {
        status: response.status,
        statusText: response.statusText,
        url,
        country: iso3Code
      })
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    
    // Log successful data fetch
    console.log('Successfully fetched map data:', {
      country: iso3Code,
      order,
      dataPoints: data.length || 0,
      url
    })
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching map data:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      country,
      iso3Code,
      order,
      url,
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ error: "Failed to fetch map data" }, { status: 500 })
  }
}

