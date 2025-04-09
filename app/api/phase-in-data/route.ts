import { NextResponse } from "next/server"

// Define the phase-in variables with their mapping to the external data source
const PHASE_IN_VARIABLES = [
  // Renewable technologies - blues to greens
  { id: "solar", name: "Solar", sourceKey: "solar", color: "#82ca9d" },
  { id: "onshore_wind", name: "Onshore Wind", sourceKey: "onshore_wind", color: "#4caf50" },
  { id: "offshore_wind", name: "Offshore Wind", sourceKey: "offshore_wind", color: "#00b4d8" },
  { id: "hydropower", name: "Hydropower", sourceKey: "hydropower", color: "#0077b6" },
  { id: "geothermal", name: "Geothermal", sourceKey: "geothermal", color: "#0096c7" },
  
  // Storage technologies - oranges to yellows
  { id: "battery_short", name: "Short-term Battery", sourceKey: "battery_short", color: "#ffbd59" },
  { id: "battery_long", name: "Long-term Battery", sourceKey: "battery_long", color: "#ff7c43" },
]

// Data source URL
const DATA_URL = 'https://fapublicdata.blob.core.windows.net/fa-public-data/phase_in_bar_chart/phase_in_data.json'

// Function to transform data from the external source to the format needed by the chart
async function fetchAndTransformPhaseInData(country: string) {
  // Convert country code to uppercase to match the data format
  const countryCode = country.toUpperCase()
  
  // Fetch data from the external URL
  const response = await fetch(DATA_URL, { next: { revalidate: 3600 } }) // Cache for 1 hour
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
  }
  
  const rawData = await response.json()
  
  // Check if data exists for the selected country
  if (!rawData[countryCode]) {
    throw new Error(`No data available for country code: ${countryCode}`)
  }
  
  const countryData = rawData[countryCode]
  
  // Ensure we have at least one data source
  const hasData = Object.keys(countryData).some(key => 
    countryData[key] && Object.keys(countryData[key]).length > 0
  )
  
  if (!hasData) {
    throw new Error(`No phase-in data available for ${countryCode}`)
  }
  
  // Transform the data into the format expected by the chart
  // First get all available years between 2024 and 2050
  const years = Object.keys(countryData.solar || countryData.hydropower || countryData.onshore_wind || {})
    .filter(year => year >= "2024" && year <= "2050") // Filter valid years
    .sort() // Sort years in ascending order
  
  return years.map(year => {
    const yearData: Record<string, any> = { year }
    
    // Add each phase-in variable to the year data
    PHASE_IN_VARIABLES.forEach(variable => {
      const sourceData = countryData[variable.sourceKey]
      if (sourceData && sourceData[year] !== null && sourceData[year] !== undefined) {
        // Values in the data are already in absolute amounts
        yearData[variable.id] = sourceData[year]
      } else {
        yearData[variable.id] = 0
      }
    })
    
    return yearData
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get("country") || "in"

  try {
    const data = await fetchAndTransformPhaseInData(country)

    return NextResponse.json({
      variables: PHASE_IN_VARIABLES,
      data: data,
    })
  } catch (error: any) {
    console.error("Error in phase-in-data API:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch or process data" }, 
      { status: 500 }
    )
  }
} 