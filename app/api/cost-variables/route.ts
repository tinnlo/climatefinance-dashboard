import { NextResponse } from "next/server"

// Define the cost variables with their mapping to the external data source
const COST_VARIABLES = [
  // Warm tones from the "costs" palette (oranges/reds)
  { id: "cost_battery_grid", name: "Grid Battery", sourceKey: "battery_grid", color: "#e65c1a" },
  { id: "cost_battery_long", name: "Long-term Battery", sourceKey: "battery_long", color: "#ff7c43" },
  { id: "cost_battery_pe", name: "PE Battery", sourceKey: "battery_pe", color: "#ff9e6d" },
  { id: "cost_battery_short", name: "Short-term Battery", sourceKey: "battery_short", color: "#ffbd59" },
  { id: "opportunity_cost", name: "Opportunity", sourceKey: "opportunity_cost", color: "#ffd29c" },
  
  // Worker-related costs using climate finance colors
  { id: "worker_compensation_cost", name: "Worker Compensation", sourceKey: "worker_compensation", color: "#b3de69" },
  { id: "worker_retraining_cost", name: "Worker Retraining", sourceKey: "worker_retraining", color: "#d4e79e" },
  
  // Cool tones from the "benefits" palette (blues)
  { id: "solar_cost", name: "Solar", sourceKey: "solar", color: "#80d3e8" },
  { id: "wind_offshore_cost", name: "Wind Offshore", sourceKey: "wind_offshore", color: "#48cae4" },
  { id: "wind_onshore_cost", name: "Wind Onshore", sourceKey: "wind_onshore", color: "#00b4d8" },
  { id: "geothermal_cost", name: "Geothermal", sourceKey: "geothermal", color: "#0096c7" },
  { id: "hydropower_cost", name: "Hydropower", sourceKey: "hydropower", color: "#0077b6" },
]

// Data source URL
const DATA_URL = 'https://fapublicdata.blob.core.windows.net/fa-public-data/aggregated_cost/aggregated_cost_data.json'

// Function to transform data from the external source to the format needed by the chart
async function fetchAndTransformCostData(country: string) {
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
    throw new Error(`No cost data available for ${countryCode}`)
  }
  
  // Transform the data into the format expected by the chart
  const years = Object.keys(countryData.battery_grid || {})
    .filter(year => year >= "2024" && year <= "2050") // Filter valid years
    .sort() // Sort years in ascending order
  
  return years.map(year => {
    const yearData: Record<string, any> = { year }
    
    // Add each cost variable to the year data
    COST_VARIABLES.forEach(variable => {
      const sourceData = countryData[variable.sourceKey]
      if (sourceData && sourceData[year] !== null && sourceData[year] !== undefined) {
        // Values in the data are already in trillions
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
    const data = await fetchAndTransformCostData(country)

    return NextResponse.json({
      variables: COST_VARIABLES,
      data: data,
    })
  } catch (error: any) {
    console.error("Error in cost-variables API:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch or process data" }, 
      { status: 500 }
    )
  }
}

