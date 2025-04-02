import { NextResponse } from "next/server"
import { convertToIso3 } from "@/lib/utils"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country") || "IND"
    
    // Convert from ISO2 to ISO3 if needed
    const countryCode = country.length === 2 ? convertToIso3(country) : country
    
    // Fetch data from the external source
    const response = await fetch("https://fapublicdata.blob.core.windows.net/fa-public-data/alignment_graph/alignment_data.json")
    
    if (!response.ok) {
      throw new Error(`Failed to fetch alignment data: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Check if we have data for the requested country
    if (!data[countryCode]) {
      return NextResponse.json({ error: `No data available for country: ${countryCode}` }, { status: 404 })
    }
    
    const countryData = data[countryCode]
    
    // Transform the data for the chart - include all years
    const formattedData = Object.keys(countryData.Emission_Intensity)
      .filter(year => {
        // Only include years that exist in the dataset
        const yearInt = parseInt(year)
        return !isNaN(yearInt)
      })
      .sort((a, b) => parseInt(a) - parseInt(b)) // Ensure years are in chronological order
      .map(year => {
        const yearInt = parseInt(year)
        const emissionIntensity = countryData.Emission_Intensity[year] / 1000 // Convert to correct units
        const targetValue = countryData.Emission_Intensity_Target[year] 
          ? countryData.Emission_Intensity_Target[year] / 1000 
          : null
        
        // Create the base data point with only the actual paths (no scenario data)
        return {
          Year: year,
          "Asset-based Pathway": emissionIntensity,
          "Disclosed Target": targetValue
        }
      })
    
    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("Error in alignment-data API:", error)
    return NextResponse.json({ error: "Failed to fetch alignment data" }, { status: 500 })
  }
} 