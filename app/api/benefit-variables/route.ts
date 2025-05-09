import { NextResponse } from 'next/server'

// Define types for the data structure
interface BenefitVariable {
  id: string
  name: string
  color: string
}

interface YearData {
  year: string
  [key: string]: number | string // Allow indexing with variable IDs
}

// Define the benefit variables with their mapping
const BENEFIT_VARIABLES: BenefitVariable[] = [
  { id: "Reduced Economic Damages", name: "Reduced Economic Damages", color: "#ffa600" },
  { id: "Reduced Air Pollution", name: "Reduced Air Pollution", color: "#00b4d8" },
]

// Data source URL
const DATA_URL = 'https://fapublicdata.blob.core.windows.net/fa-public-data/aggregated_cost/aggregated_benefit_data.json'

// Function to transform data from the external source to the format needed by the chart
async function fetchAndTransformBenefitData(country: string) {
  // Convert country code to uppercase to match the data format
  const countryCode = country.toUpperCase()
  
  // Fetch data from the external URL
  const response = await fetch(DATA_URL, { next: { revalidate: 3600 } }) // Cache for 1 hour
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`)
  }
  
  const rawData = await response.json()
  
  // Check if data exists for the selected country
  if (!rawData[countryCode]) {
    throw new Error(`No data available for country code: ${countryCode}`)
  }
  
  const countryData = rawData[countryCode]

  // Find which benefit variables have data
  const availableVariables = BENEFIT_VARIABLES.filter(variable => 
    variable.id === "Reduced Air Pollution" || 
    (variable.id === "Reduced Economic Damages" && 
     (countryData["Coal"] || countryData["Gas"] || countryData["Oil"]))
  )

  if (availableVariables.length === 0) {
    throw new Error(`No benefit data available for country code: ${countryCode}`)
  }

  // Get years from the first available variable's data
  const years = Object.keys(countryData["Coal"] || countryData["Gas"] || countryData["Oil"] || countryData["Reduced Air Pollution"])
    .filter(year => year >= "2024" && year <= "2050") // Filter valid years
    .sort() // Sort years in ascending order

  // Transform the data into year-by-year format
  const yearlyData: YearData[] = years.map(year => {
    const yearData: YearData = { year }

    // Add each benefit variable's value for this year
    BENEFIT_VARIABLES.forEach(variable => {
      if (variable.id === "Reduced Economic Damages") {
        // Sum up the values from Coal, Gas, and Oil
        const coalValue = countryData["Coal"]?.[year] || 0
        const gasValue = countryData["Gas"]?.[year] || 0
        const oilValue = countryData["Oil"]?.[year] || 0
        yearData[variable.id] = coalValue + gasValue + oilValue
      } else {
        const value = countryData[variable.id]?.[year]
        yearData[variable.id] = typeof value === 'number' ? value : 0
      }
    })

    return yearData
  })

  return {
    variables: availableVariables,
    data: yearlyData
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get("country") || "in"

  try {
    const result = await fetchAndTransformBenefitData(country)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error in benefit-variables API:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch or process data" },
      { status: 500 }
    )
  }
} 