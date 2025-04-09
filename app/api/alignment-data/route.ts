import { NextResponse } from "next/server"
import { convertToIso3 } from "@/lib/utils"

// Static scenario data for 1.5°C and Below 2°C pathways
const scenarioData = [
  { "Year": 2000, "1.5 Degrees_Global": 0.582, "Below 2 Degrees_Global": 0.582 },
  { "Year": 2001, "1.5 Degrees_Global": 0.577, "Below 2 Degrees_Global": 0.577 },
  { "Year": 2002, "1.5 Degrees_Global": 0.571, "Below 2 Degrees_Global": 0.571 },
  { "Year": 2003, "1.5 Degrees_Global": 0.566, "Below 2 Degrees_Global": 0.566 },
  { "Year": 2004, "1.5 Degrees_Global": 0.56, "Below 2 Degrees_Global": 0.56 },
  { "Year": 2005, "1.5 Degrees_Global": 0.554, "Below 2 Degrees_Global": 0.554 },
  { "Year": 2006, "1.5 Degrees_Global": 0.549, "Below 2 Degrees_Global": 0.549 },
  { "Year": 2007, "1.5 Degrees_Global": 0.543, "Below 2 Degrees_Global": 0.543 },
  { "Year": 2008, "1.5 Degrees_Global": 0.538, "Below 2 Degrees_Global": 0.538 },
  { "Year": 2009, "1.5 Degrees_Global": 0.532, "Below 2 Degrees_Global": 0.532 },
  { "Year": 2010, "1.5 Degrees_Global": 0.527, "Below 2 Degrees_Global": 0.527 },
  { "Year": 2011, "1.5 Degrees_Global": 0.521, "Below 2 Degrees_Global": 0.521 },
  { "Year": 2012, "1.5 Degrees_Global": 0.516, "Below 2 Degrees_Global": 0.516 },
  { "Year": 2013, "1.5 Degrees_Global": 0.51, "Below 2 Degrees_Global": 0.51 },
  { "Year": 2014, "1.5 Degrees_Global": 0.504, "Below 2 Degrees_Global": 0.504 },
  { "Year": 2015, "1.5 Degrees_Global": 0.499, "Below 2 Degrees_Global": 0.499 },
  { "Year": 2016, "1.5 Degrees_Global": 0.493, "Below 2 Degrees_Global": 0.493 },
  { "Year": 2017, "1.5 Degrees_Global": 0.487, "Below 2 Degrees_Global": 0.487 },
  { "Year": 2018, "1.5 Degrees_Global": 0.481, "Below 2 Degrees_Global": 0.481 },
  { "Year": 2019, "1.5 Degrees_Global": 0.476, "Below 2 Degrees_Global": 0.476 },
  { "Year": 2020, "1.5 Degrees_Global": 0.47, "Below 2 Degrees_Global": 0.47 },
  { "Year": 2021, "1.5 Degrees_Global": 0.464, "Below 2 Degrees_Global": 0.464 },
  { "Year": 2022, "1.5 Degrees_Global": 0.46, "Below 2 Degrees_Global": 0.46 },
  { "Year": 2023, "1.5 Degrees_Global": 0.426, "Below 2 Degrees_Global": 0.434 },
  { "Year": 2024, "1.5 Degrees_Global": 0.392, "Below 2 Degrees_Global": 0.409 },
  { "Year": 2025, "1.5 Degrees_Global": 0.357, "Below 2 Degrees_Global": 0.383 },
  { "Year": 2026, "1.5 Degrees_Global": 0.323, "Below 2 Degrees_Global": 0.358 },
  { "Year": 2027, "1.5 Degrees_Global": 0.289, "Below 2 Degrees_Global": 0.332 },
  { "Year": 2028, "1.5 Degrees_Global": 0.255, "Below 2 Degrees_Global": 0.306 },
  { "Year": 2029, "1.5 Degrees_Global": 0.22, "Below 2 Degrees_Global": 0.281 },
  { "Year": 2030, "1.5 Degrees_Global": 0.186, "Below 2 Degrees_Global": 0.255 },
  { "Year": 2031, "1.5 Degrees_Global": 0.158, "Below 2 Degrees_Global": 0.233 },
  { "Year": 2032, "1.5 Degrees_Global": 0.131, "Below 2 Degrees_Global": 0.21 },
  { "Year": 2033, "1.5 Degrees_Global": 0.103, "Below 2 Degrees_Global": 0.188 },
  { "Year": 2034, "1.5 Degrees_Global": 0.076, "Below 2 Degrees_Global": 0.166 },
  { "Year": 2035, "1.5 Degrees_Global": 0.048, "Below 2 Degrees_Global": 0.143 },
  { "Year": 2036, "1.5 Degrees_Global": 0.039, "Below 2 Degrees_Global": 0.132 },
  { "Year": 2037, "1.5 Degrees_Global": 0.03, "Below 2 Degrees_Global": 0.121 },
  { "Year": 2038, "1.5 Degrees_Global": 0.021, "Below 2 Degrees_Global": 0.11 },
  { "Year": 2039, "1.5 Degrees_Global": 0.012, "Below 2 Degrees_Global": 0.098 },
  { "Year": 2040, "1.5 Degrees_Global": 0.0, "Below 2 Degrees_Global": 0.087 },
  { "Year": 2041, "1.5 Degrees_Global": 0.0, "Below 2 Degrees_Global": 0.082 },
  { "Year": 2042, "1.5 Degrees_Global": 0.0, "Below 2 Degrees_Global": 0.077 },
  { "Year": 2043, "1.5 Degrees_Global": 0.0, "Below 2 Degrees_Global": 0.072 },
  { "Year": 2044, "1.5 Degrees_Global": 0.0, "Below 2 Degrees_Global": 0.067 },
  { "Year": 2045, "1.5 Degrees_Global": 0.0, "Below 2 Degrees_Global": 0.062 },
  { "Year": 2046, "1.5 Degrees_Global": 0.0, "Below 2 Degrees_Global": 0.057 },
  { "Year": 2047, "1.5 Degrees_Global": 0.0, "Below 2 Degrees_Global": 0.052 },
  { "Year": 2048, "1.5 Degrees_Global": 0.0, "Below 2 Degrees_Global": 0.047 },
  { "Year": 2049, "1.5 Degrees_Global": 0.0, "Below 2 Degrees_Global": 0.041 },
  { "Year": 2050, "1.5 Degrees_Global": 0.0, "Below 2 Degrees_Global": 0.036 }
];

// Convert scenario data to a map for easy lookup
export const scenarioDataMap = scenarioData.reduce((map, item) => {
  map[item.Year.toString()] = {
    "1.5°C Global": item["1.5 Degrees_Global"],
    "Below 2°C Global": item["Below 2 Degrees_Global"]
  };
  return map;
}, {} as Record<string, { "1.5°C Global": number, "Below 2°C Global": number }>);

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
    
    // Return the raw data for the country
    return NextResponse.json(data[countryCode])
  } catch (error) {
    console.error("Error in alignment data API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
} 